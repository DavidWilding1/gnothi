import os, pdb, math
from tqdm import tqdm
from utils import engine, cosine, book_engine, cluster, tnormalize
from cleantext import Clean
from box import Box
import numpy as np
import pandas as pd
import pickle
from nlp import nlp_
from sqlalchemy import text
from sklearn import preprocessing as pp

from keras import backend as K
from keras.layers import Input, Dense
from keras.models import Model
from keras.callbacks import EarlyStopping
from keras.optimizers import Adam


def load_books():
    path_ = 'tmp/libgen.pkl'
    if os.path.exists(path_):
        print("Loading cached book data")
        with open(path_, 'rb') as pkl:
            return pickle.load(pkl)

    print("Fetching books")
    # for-sure psych. See tmp/topics.txt, or libgen.sql topics(lang='en')
    psych_topics = 'psychology|self-help|therapy'
    # good other psych topics, either mis-categorized or other
    psych_topics += '|anthropology|social|religion'
    psych_topics += '|^history|^education'

    sql = Box(
        select="select u.ID, u.Title, u.Author, d.descr, t.topic_descr",
        body="""
        from updated u
            inner join description d on d.md5=u.MD5
            inner join topics t on u.Topic=t.topic_id
                and t.lang='en'
        where u.Language = 'English'
            and title not regexp 'sams|teach yourself'  -- remove junk
            and (length(d.descr) + length(u.Title)) > 200
        and u.ID not in ('62056','72779','111551','165602','165606','239835','240399','272945','310202','339718','390651','530739','570667','581466','862274','862275','879029','935149','1157279','1204687','1210652','1307307','1410416','1517634','1568907','1592543','2103755','2128089','2130515','2187329','2270690','2270720','2275684','2275804','2277017','2284616','2285559','2314405','2325313','2329959','2340421','2347272','2374055','2397307','2412259','2420958','2421152','2421413','2423975')
        """,

        # handle u.Topic='' (1326526 rows)
        just_psych = f"and t.topic_descr regexp '{psych_topics}'",

        # find_problems
        just_ids="select distinct u.ID",
        where_id="and u.ID=:id"
    )

    FIND_PROBLEMS = False
    ALL_BOOKS = False

    if FIND_PROBLEMS:
        # # Those MD5s: UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 636: character maps to <undefined>
        # TODO try instead create_engine(convert_unicode=True)

        ids = ' '.join([sql.just_ids, sql.body])
        ids = [x.ID for x in book_engine.execute(ids).fetchall()]
        problem_ids = []
        for i, id in enumerate(tqdm(ids)):
            if i%10000==0:
                print(len(problem_ids)/len(ids)*100, '% problems')
            try:
                row = ' '.join([sql.select, sql.body, sql.where_id])
                book_engine.execute(text(row), id=id)
            except:
                problem_ids.append(id)
        problem_ids = ','.join([f"'{id}'" for id in problem_ids])
        print(f"and u.ID not in ({problem_ids})")
        exit(0)

    sql_ = [sql.select, sql.body]
    if not ALL_BOOKS: sql_ += [sql.just_psych]
    sql_ = ' '.join(sql_)
    with book_engine.connect() as conn:
        books = pd.read_sql(sql_, conn)
    books = books.drop_duplicates(['Title', 'Author'])

    print('n_books before cleanup', books.shape[0])
    print("Removing HTML")
    broken = '(\?\?\?|\#\#\#)'  # russian / other FIXME better way to handle
    books = books[~(books.Title + books.descr).str.contains(broken)]\
        .drop_duplicates(['Title', 'Author'])  # TODO reconsider

    books['descr'] = books.descr.apply(Clean.strip_html)\
        .apply(Clean.fix_punct)\
        .apply(Clean.only_ascii)\
        .apply(Clean.multiple_whitespace)\
        .apply(Clean.unmark)

    books['clean'] = books.Title + '\n' + books.descr
    # books = books[books.clean.apply(lambda x: detect(x) == 'en')]
    print('n_books after cleanup', books.shape[0])
    e_books = books.clean.tolist()

    print(f"Running BERT on {len(e_books)} entries")
    vecs_books = nlp_.sentence_encode(e_books)
    with open(path_, 'wb') as pkl:
        pickle.dump([vecs_books, books], pkl)
    return vecs_books, books


def predict_dists(books, vecs_books, shelf_idx, fine_tune=True):
    # TODO cache this, re-train every x new entries / votes.

    # linear+mse for smoother distances, what we have here? where sigmoid+xentropy for
    # harder decision boundaries, which we don't have?
    # act, loss = 'linear', 'mse'
    act, loss = 'sigmoid', 'binary_crossentropy'

    input = Input(shape=(vecs_books.shape[1],))
    m = Dense(400, activation='elu')(input)
    m = Dense(1, activation=act)(m)
    m = Model(input, m)
    m.compile(
        # metrics=['accuracy'],
        loss=loss,
        optimizer=Adam(learning_rate=.0001),
    )

    x = vecs_books
    y = books.dist
    es = EarlyStopping(monitor='val_loss', mode='min', patience=3, min_delta=.0001)
    m.fit(
        x, y,
        epochs=50,
        batch_size=128,
        shuffle=True,
        callbacks=[es],
        validation_split=.3,
    )
    if not fine_tune:
        return m.predict(x)

    # Train harder on shelved books
    # K.set_value(m.optimizer.learning_rate, 0.0001)  # alternatively https://stackoverflow.com/a/60420156/362790
    x2 = x[shelf_idx]
    y2 = books[shelf_idx].dist
    m.fit(
        x2, y2,
        epochs=3,  # too many epochs overfits (eg to CBT). Maybe adjust LR *down*, or other?
        batch_size=8,
        callbacks=[es],
        validation_split=.3  # might not have enough data?
    )
    return m.predict(x)


def get_books(user_id, entries, n_recs=30):
    entries = Clean.entries_to_paras(entries)
    vecs_user = nlp_.sentence_encode(entries)

    print("Loading books")
    vecs_books, books = load_books()
    books = books.rename(columns=dict(
        ID='id',
        descr='text',
        Title='title',
        Author='author',
        topic_descr='topic'
    )).set_index('id', drop=False)

    # normalize for cosine, and downstream DNN
    vecs_user, vecs_books = tnormalize(vecs_user, vecs_books)

    print("Finding similars")
    # 5fe7b3e2: cluster centroids (removed since DNN will act as clusterer)
    # Take best score for every book
    dist = cosine(vecs_user, vecs_books, norm_in=False, norm_out=True).min(axis=0)
    # 0f29e591: minmax_scale(dist). norm_out=True works better
    # then map back onto books, so they're back in order (pandas index-matching)
    books['dist'] = dist

    with engine.connect() as conn:
        sql = "select book_id as id, user_id, shelf from bookshelf where user_id=%(uid)s"
        shelf = pd.read_sql(sql, conn, params={'uid': user_id}).set_index('id', drop=False)
    shelf_idx = books.id.isin(shelf.id)
    shelf_map = dict(like=0., already_read=0., recommend=0., dislike=1., remove=None)
    shelf['dist'] = shelf.shelf.apply(lambda k: shelf_map[k])
    shelf.dist.fillna(books.dist, inplace=True)  # fill in "remove"
    books.loc[shelf.index, 'dist'] = shelf.dist  # indexes(id) match, so assigns correctly
    assert not books.dist.isna().any(), "Messed up merging shelf/books.dist by index"

    # apply DNN anyway? Kinda acts like a clusterer/smoother
    if shelf_idx.sum() > 5:
        books['dist'] = predict_dists(books, vecs_books, shelf_idx)

    # dupes by title in libgen
    # r = books.sort_values('dist')\
    r = books[~shelf_idx].sort_values('dist')\
        .drop_duplicates('title', keep='first')\
        .iloc[:n_recs]
    r = [x for x in r.T.to_dict().values()]
    return r