import pdb
from flask_jwt import jwt_required, current_identity
from jwtauthtest import app
from jwtauthtest.database import db_session
from jwtauthtest.models import User, Entry, Field, FieldEntry
from passlib.hash import pbkdf2_sha256
from flask import request, jsonify
from jwtauthtest.utils import vars

def useradd(username, password):
    db_session.add(User(username, pbkdf2_sha256.hash(password)))
    db_session.commit()


@app.route('/check-jwt')
@jwt_required()
def check_jwt():
    return jsonify({'ok': True})


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    useradd(data['username'], data['password'])
    return jsonify({'ok': True})


@app.route('/entries', methods=['GET', 'POST'])
@jwt_required()
def entries():
    user = current_identity
    if request.method == 'GET':
        return jsonify({'entries': [e.json() for e in user.entries]})
    elif request.method == 'POST':
        data = request.get_json()
        entry = Entry(data['title'], data['text'])
        user.entries.append(entry)
        for k, v in data['fields'].items():
            entry.field_entries.append(FieldEntry(v, k))
        db_session.commit()
        return jsonify({'ok': True})


@app.route('/entries/<entry_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def entry(entry_id):
    user = current_identity
    entry = Entry.query.filter_by(user_id=user.id, id=entry_id)
    if request.method == 'GET':
        return jsonify(entry.first().json())
    if request.method == 'PUT':
        data = request.get_json()
        entry = entry.first()
        entry.title = data['title']
        entry.text = data['text']
        # FIXME doesn't account for fields added after saving entry
        for f in entry.field_entries:
            f.value = data['fields'][str(f.field_id)]
        db_session.commit()
        return jsonify({'ok': True})
    if request.method == 'DELETE':
        entry.delete()
        db_session.commit()
        return jsonify({'ok': True})


@app.route('/fields', methods=['GET', 'POST'])
@jwt_required()
def fields():
    user = current_identity
    if request.method == 'GET':
        return jsonify({'fields': [f.json() for f in user.fields]})


import requests
@app.route('/habitica/<entry_id>', methods=['GET'])
@jwt_required()
def get_habitica(entry_id):
    user = current_identity
    entry = Entry.query\
        .filter_by(user_id=user.id, id=entry_id)\
        .first()

    # https://habitica.com/apidoc/#api-Task-GetUserTasks
    r = requests.get(
        'https://habitica.com/api/v3/tasks/user',
        headers={
            "Content-Type": "application/json",
            "x-api-user": vars.HABIT.USER,
            "x-api-key": vars.HABIT.KEY,
            "x-client": f"{vars.HABIT.USER}-{vars.HABIT.APP}"
        }
    ).json()

    f_id_map = {f.service_id: f for f in user.fields}
    fe_id_map = {f.field_id: f for f in entry.field_entries}
    t_id_map = {task['id']: task for task in r['data']}

    # Remove Habitica-deleted tasks
    for f in user.fields:
        if f.service != 'habitica': continue
        if f.service_id not in f_id_map:
            f.delete()

    # Add/update tasks from Habitica
    for task in r['data']:
        # {id, text, type, value}
        # habit: {counterUp, counterDown}
        # daily:{checklist: [{completed}], completed, isDue}

        # only care about habits/dailies
        if task['type'] not in ['habit', 'daily']: continue

        f = f_id_map.get(task['id'], None)
        if not f:
            # Field doesn't exist here yet, add it.
            # TODO delete things here if deleted in habitica
            f = Field(
                service='habitica',
                service_id=task['id'],
                name=task['text'],
                type='number'
            )
            user.fields.append(f)
        # Text has changed on Habitica, update here
        if f.name != task['text']:
            f.name = task['text']

        db_session.commit()  # for f to have f.id?

        value = 0.
        # Habit
        if task['type'] == 'habit':
            value = task['counterUp'] - task['counterDown']
        # Daily
        else:
            # TODO How to handle !isDue? True automatically? Null?

            # With Checklist
            if task['checklist']:
                value = 1. if task['completed'] else\
                    sum(c['completed'] for c in task['checklist']) / len(task['checklist'])
            # Without
            else:
                value = float(task['completed'])
        fe = fe_id_map.get(f.id, None)
        if fe:
            fe.value = value
        else:
            fe = FieldEntry(value, f.id)
            entry.field_entries.append(fe)
        db_session.commit()
        print(task['text'], 'done')

    return jsonify({'ok': True})
