from pprint import pprint
try:
    from config.database import db
    doc = db["LogoPoster"].find_one(sort=[('createdAt', -1)])
    if doc:
        doc['_id'] = str(doc['_id'])
        pprint(doc)
    else:
        print("No document found.")
except Exception as e:
    print("Error:", e)
