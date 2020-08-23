import enum, pdb, re, threading, time, datetime
from typing import List
from dateutil import tz
from app.database import Base, SessLocal, fa_users_db
from app.utils import vars
from app import ml
from sqlalchemy import text, Column, Integer, Enum, Float, ForeignKey, Boolean, DateTime, JSON, Date, Unicode, \
    func, TIMESTAMP, select
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship, backref, object_session, column_property
from sqlalchemy.dialects.postgresql import UUID, BYTEA
from sqlalchemy_utils.types import EmailType
from sqlalchemy_utils.types.encrypted.encrypted_type import StringEncryptedType, FernetEngine
from uuid import uuid4
from fastapi_sqlalchemy import db  # an object to provide global access to a database session

from fastapi_users.db import SQLAlchemyBaseUserTable, SQLAlchemyUserDatabase
import app.schemas as S


def uuid_():
    return str(uuid4())


# Note: using sa.Unicode for all Text/Varchar columns to be consistent with sqlalchemy_utils examples. Also keeping all
# text fields unlimited (no varchar(max_length)) as Postgres doesn't incur penalty, unlike MySQL, and we don't know
# how long str will be after encryption.
def Encrypt(Col, **args):
    return Column(StringEncryptedType(Col, vars.FLASK_KEY, FernetEngine), **args)


# https://dev.to/zchtodd/sqlalchemy-cascading-deletes-8hk
parent_cascade = dict(cascade="all, delete", passive_deletes=True)
child_cascade = dict(ondelete="cascade")


class User(Base, SQLAlchemyBaseUserTable):
    __tablename__ = 'users'

    first_name = Encrypt(Unicode)
    last_name = Encrypt(Unicode)
    gender = Encrypt(Unicode)
    orientation = Encrypt(Unicode)
    birthday = Column(Date)  # TODO encrypt (how to store/migrate dates?)
    timezone = Column(Unicode)
    bio = Encrypt(Unicode)

    habitica_user_id = Encrypt(Unicode)
    habitica_api_token = Encrypt(Unicode)

    entries = relationship("Entry", order_by='Entry.created_at.desc()', **parent_cascade)
    field_entries = relationship("FieldEntry", order_by='FieldEntry.created_at.desc()', **parent_cascade)
    fields = relationship("Field", order_by='Field.created_at.asc()', **parent_cascade)
    people = relationship("Person", order_by='Person.name.asc()', **parent_cascade)
    shares = relationship("Share", **parent_cascade)
    tags = relationship("Tag", order_by='Tag.name.asc()', **parent_cascade)

    @staticmethod
    def snoop(viewer, as_id):
        as_user, snooping = None, False
        if viewer.id != as_id:
            as_user = db.session.query(User) \
                .join(Share) \
                .filter(Share.email == viewer.email, Share.user_id == as_id) \
                .first()
        if as_user:
            as_user.share_data = db.session.query(Share) \
                .filter_by(user_id=as_id, email=viewer.email) \
                .first()
            snooping = True
        else:
            # as_user = viewer
            # fastapi-users giving me beef, re-load from sqlalchemy
            as_user = db.session.query(User).get(viewer.id)
        return as_user, snooping

    @property
    def shared_with_me(self):
        return object_session(self).query(User)\
            .join(Share)\
            .filter(Share.email == self.email)\
            .all()

    def profile_to_text(self):
        txt = ''
        if self.gender:
            txt += f"I am {self.gender}. "
        if self.orientation and not re.match("straight", self.orientation, re.IGNORECASE):
            txt += f"I am {self.orientation}. "
        if self.bio:
            txt += self.bio
        for p in self.people:
            whose = "" if "'" in p.relation.split(' ')[0] else "my "
            txt += f"{p.name} is {whose}{p.relation}. "
            if p.bio: txt += p.bio
            # if p.issues: txt += f" {p.name} has these issues: {p.issues} "
        txt = re.sub(r'\s+', ' ', txt)
        # print(txt)
        return txt

user_db = SQLAlchemyUserDatabase(S.FU_UserDB, fa_users_db, User.__table__)


class Entry(Base):
    __tablename__ = 'entries'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_)
    # Title optional, otherwise generated from text. topic-modeled, or BERT summary, etc?
    title = Encrypt(Unicode)
    text = Encrypt(Unicode, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Generated
    title_summary = Encrypt(Unicode)
    text_summary = Encrypt(Unicode)
    sentiment = Encrypt(Unicode)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', **child_cascade))
    entry_tags_ = relationship("EntryTag", **parent_cascade)

    # share_tags = relationship("EntryTag", secondary="shares_tags")

    @property
    def entry_tags(self):
        return {t.tag_id: True for t in self.entry_tags_}

    @staticmethod
    def snoop(
        viewer_email: str,
        target_id: str,
        snooping: bool = False,
        entry_id: str = None,
        order_by=None,
        tags: List[str] = None,
        days: int = None
    ):
        if not snooping:
            q = db.session.query(Entry).filter(Entry.user_id == target_id)
        if snooping:
            q = db.session.query(Entry)\
                .join(EntryTag, Entry.id == EntryTag.entry_id)\
                .join(ShareTag, EntryTag.tag_id == ShareTag.tag_id)\
                .join(Share, ShareTag.share_id == Share.id)\
                .filter(Share.email == viewer_email, Share.user_id == target_id)

        if entry_id:
            q = q.filter(Entry.id == entry_id)

        if tags:
            if not snooping:
                # already joined otherwise
                q = q.join(EntryTag, Tag)
            q = q.filter(EntryTag.tag_id.in_(tags))

        if days:
            now = datetime.datetime.utcnow()
            x_days = now - datetime.timedelta(days=days)
            # build a beginning-to-end story
            q = q.filter(Entry.created_at > x_days)
            order_by = Entry.created_at.asc()

        if order_by is None:
            order_by = Entry.created_at.desc()
        return q.order_by(order_by)

    @staticmethod
    def run_models_(id):
        with db():
            while True:
                res = db.session.execute("select status from jobs_status").fetchone()
                if res.status != 'on':
                    time.sleep(1)
                    continue
                entry = db.session.query(Entry).get(id)
                entry.title_summary = ml.summarize(entry.text, 5, 20, with_sentiment=False)["summary_text"]
                summary = ml.summarize(entry.text, 32, 128)
                entry.text_summary = summary["summary_text"]
                entry.sentiment = summary["sentiment"]
                db.session.commit()

                # every x entries, update book recommendations
                user = db.session.query(User).get(entry.user_id)
                sql = 'select count(*)%2=0 as ct from entries where user_id=:uid'
                should_update = db.session.execute(text(sql), {'uid':user.id}).fetchone().ct
                if should_update:
                    ml.books(user, bust=True)

                return

    def run_models(self):
        # Run summarization/sentiment in background thread, so (a) user can get back to business;
        # (b) if AI server offline, wait till online
        self.title_summary = "🕒 AI is generating a title"
        self.text_summary = "🕒 AI is generating a summary"
        t = threading.Thread(target=Entry.run_models_, args=(self.id,))
        t.start()
        # Entry.run_models_(self.id)  # debug w/o threading


class FieldType(enum.Enum):
    # medication changes / substance intake
    # exercise, sleep, diet, weight
    number = 1

    # happiness score
    fivestar = 2

    # periods
    check = 3

    # moods (happy, sad, anxious, wired, bored, ..)
    option = 4

    # think of more
    # weather_api?
    # text entries?


class DefaultValueTypes(enum.Enum):
    value = 1  # which includes None
    average = 2
    ffill = 3


class Field(Base):
    """Entries that change over time. Uses:
    * Charts
    * Effects of sentiment, topics on entries
    * Global trends (exercise -> 73% happiness)
    """
    __tablename__ = 'fields'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_)
    type = Column(Enum(FieldType))
    name = Encrypt(Unicode)
    # Start entries/graphs/correlations here
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Don't actually delete fields, unless it's the same day. Instead
    # stop entries/graphs/correlations here
    excluded_at = Column(DateTime)
    default_value = Column(Enum(DefaultValueTypes), default="value")
    default_value_value = Column(Float, default=None)
    target = Column(Boolean, default=False)
    # option{single_or_multi, options:[], ..}
    # number{float_or_int, ..}
    attributes = Column(JSON)
    # Used if pulling from external service
    service = Column(Unicode)
    service_id = Column(Unicode)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', **child_cascade))

    json_fields = """
    id
    name
    created_at
    excluded_at
    default_value_value
    target
    service
    service_id
    """

    def json(self):
        json_fields = {k: getattr(self, k) for k in self.json_fields.split()}
        history = db.session.query(FieldEntry)\
            .with_entities(FieldEntry.value, FieldEntry.created_at)\
            .filter_by(field_id=self.id)\
            .order_by(FieldEntry.created_at.asc())\
            .all()
        history = [
            dict(value=x.value, created_at=x.created_at)
            for x in history
            if x.value is not None
        ]

        return {
            **json_fields,
            'type': self.type.name,
            'default_value': self.default_value.name if self.default_value else "value",
            'avg': sum(x['value'] for x in history) / len(history) if history else 0.,
            'history': history
        }


class FieldEntry(Base):
    __tablename__ = 'field_entries'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_)
    value = Column(Float)  # TODO Can everything be a number? reconsider
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, index=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', **child_cascade), index=True)
    field_id = Column(UUID(as_uuid=True), ForeignKey('fields.id', **child_cascade))

    @staticmethod
    def get_today_entries(user_id, field_id=None):
        return FieldEntry.get_day_entries(datetime.datetime.now(), user_id, field_id)

    @staticmethod
    def get_day_entries(day, user_id, field_id=None):
        tz_ = db.session.query(User).filter_by(id=user_id)\
            .with_entities(User.timezone)\
            .first().timezone
        tz_ = tz_ or 'America/Los_Angeles'
        timezoned = func.Date(func.timezone(tz_, FieldEntry.created_at))
        day = day.astimezone(tz.gettz(tz_))
        # timezoned = func.Date(FieldEntry.created_at)

        q = db.session.query(FieldEntry)\
            .filter(
                FieldEntry.user_id == user_id,
                timezoned == day.date()
            )
        if field_id:
            q = q.filter(FieldEntry.field_id == field_id)
        return q


class Person(Base):
    __tablename__ = 'people'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_)
    name = Encrypt(Unicode)
    relation = Encrypt(Unicode)
    issues = Encrypt(Unicode)
    bio = Encrypt(Unicode)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', **child_cascade), nullable=False)


class Share(Base):
    __tablename__ = 'shares'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    email = Column(EmailType, index=True)  # TODO encrypt?

    fields = Column(Boolean)
    books = Column(Boolean)
    profile = Column(Boolean)

    share_tags = relationship("ShareTag", **parent_cascade)
    tags_ = relationship("Tag", secondary="shares_tags")

    @property
    def tags(self):
        return {t.tag_id: True for t in self.share_tags}


class Tag(Base):
    __tablename__ = 'tags'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    name = Encrypt(Unicode, nullable=False)
    # Save user's selected tags between sessions
    selected = Column(Boolean)
    main = Column(Boolean, default=False)

    shares = relationship("Share", secondary="shares_tags")

    @staticmethod
    def snoop(from_email, to_id, snooping=False):
        if snooping:
            return db.session.query(Tag)\
                .join(ShareTag, Share)\
                .filter(Share.email==from_email, Share.user_id == to_id)
        return db.session.query(Tag).filter_by(user_id=to_id)


# FIXME cascade https://www.michaelcho.me/article/many-to-many-relationships-in-sqlalchemy-models-flask
class EntryTag(Base):
    __tablename__ = 'entries_tags'
    entry_id = Column(UUID(as_uuid=True), ForeignKey('entries.id', **child_cascade), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey('tags.id', **child_cascade), primary_key=True)


class ShareTag(Base):
    __tablename__ = 'shares_tags'
    share_id = Column(UUID(as_uuid=True), ForeignKey('shares.id', **child_cascade), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey('tags.id', **child_cascade), primary_key=True)

    tag = relationship(Tag, backref=backref("tags"))
    share = relationship(Share, backref=backref("shares"))


class Shelves(enum.Enum):
    like = 1
    already_read = 2
    dislike = 3
    remove = 4
    recommend = 5


class Bookshelf(Base):
    __tablename__ = 'bookshelf'
    book_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', **child_cascade), primary_key=True)
    shelf = Column(Enum(Shelves), nullable=False)

    @staticmethod
    def update_books(user_id):
        with db():
            # every x thumbs, update book recommendations
            sql = 'select count(*)%8=0 as ct from bookshelf where user_id=:uid'
            should_update = db.session.execute(text(sql), {'uid':user_id}).fetchone().ct
            if should_update:
                user = db.session.query(User).get(user_id)
                ml.books(user, bust=True)

    @staticmethod
    def upsert(user_id, book_id, shelf):
        sql = """
        insert into bookshelf(book_id, user_id, shelf)  
        values (:book_id, :user_id, :shelf)
        on conflict (book_id, user_id) do update set shelf=:shelf"""
        db.session.execute(text(sql), dict(user_id=user_id, book_id=int(book_id), shelf=shelf))
        db.session.commit()
        threading.Thread(target=Bookshelf.update_books, args=(user_id,)).start()

    @staticmethod
    def get_shelf(user_id, shelf):
        sql = "select book_id from bookshelf where user_id=:uid and shelf=:shelf"
        ids = db.session.execute(text(sql), dict(uid=user_id, shelf=shelf)).fetchall()
        ids = tuple([x.book_id for x in ids])
        if not ids:
            return []

        sql = """
        select u.ID as id, u.Title as title, u.Author as author, d.descr as text, t.topic_descr as topic
        from updated u
            inner join description d on d.md5=u.MD5
            inner join topics t on u.Topic=t.topic_id
        where u.ID in :ids
            and t.lang='en' and u.Language = 'English'
        """
        db_books = SessLocal['books']()
        books = db_books.execute(text(sql), {'ids':ids}).fetchall()
        db_books.close()
        return [dict(b) for b in books]


class Jobs(Base):
    __tablename__ = 'jobs'
    id = Column(UUID(as_uuid=True), primary_key=True)
    method = Column(Unicode)
    state = Column(Unicode)
    data = Column(BYTEA)


class JobsStatus(Base):
    __tablename__ = 'jobs_status'
    id = Column(Integer, primary_key=True)
    status = Column(Unicode)
    ts_client = Column(TIMESTAMP)
    ts_svc = Column(TIMESTAMP)
    svc = Column(Unicode)
