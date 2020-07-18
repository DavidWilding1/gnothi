import boto3, time, threading
from jwtauthtest.database import engine

# https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html
ec2_client = boto3.client('ec2')
EC2_ID = 'i-03e8ad4f3cadd4a4e'


def _fetch_status():
    sql = """
    SELECT status, 
        EXTRACT(EPOCH FROM (now() - ts_svc)) as elapsed_svc,
        EXTRACT(EPOCH FROM (now() - ts_client)) as elapsed_client
    FROM jobs_status
    """
    return engine.execute(sql).fetchone()


def ec2_up():
    try:
        ec2_client.start_instances(InstanceIds=[EC2_ID])
    except: pass


def jobs_status():
    res = _fetch_status()
    # job service is fresh
    if res.elapsed_svc < 5:
        return res.status
    # jobs svc stale (pending|off), decide if should turn ec2 on (debounce for race condition)
    if res.elapsed_client > 2:
        # status=on if server not turned off via ec2_down_maybe
        if res.status in ['off', 'on']:
            x = threading.Thread(target=ec2_up, daemon=True)
            x.start()
        engine.execute("update jobs_status set status='pending', ts_client=now()")
    return res.status


# already threaded since in cron job
def ec2_down_maybe():
    res = _fetch_status()
    # turn off after 5 minutes of inactivity. Note the client setInterval will keep the activity fresh while
    # using even if idling, so no need to wait long after
    if res.elapsed_client / 60 < 5 or res.status == 'off':
        return
    engine.execute("update jobs_status set status='off', ts_client=now()")
    try:
        ec2_client.stop_instances(InstanceIds=[EC2_ID])
    except: pass