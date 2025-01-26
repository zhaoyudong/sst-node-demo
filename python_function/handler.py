from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.validation import validator
import boto3
import json
import uuid
from datetime import datetime
from typing import Dict, Any
from os import environ

logger = Logger()
tracer = Tracer()
app = APIGatewayRestResolver()

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(environ.get('TABLE_NAME'))

# Schema for request validation
TODO_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "completed": {"type": "boolean"}
    },
    "required": ["title"]
}


@app.get("/v2/todos")
@tracer.capture_method
def list_todos():
    try:
        response = table.scan()
        return {"statusCode": 200, "body": response.get('Items', [])}
    except Exception as e:
        logger.exception("Failed to list todos")
        raise


@app.get("/v2/todos/<todo_id>")
@tracer.capture_method
def get_todo(todo_id: str):
    try:
        response = table.get_item(Key={'id': todo_id})
        item = response.get('Item')

        if not item:
            return {"statusCode": 404, "body": {"message": "Todo not found"}}

        return {"statusCode": 200, "body": item}
    except Exception as e:
        logger.exception(f"Failed to get todo {todo_id}")
        raise


@validator(inbound_schema=TODO_SCHEMA)
@app.post("/v2/todos")
@tracer.capture_method
def create_todo():
    try:
        data = app.current_event.json_body
        timestamp = datetime.utcnow().isoformat()

        todo = {
            'id': str(uuid.uuid4()),
            'title': data['title'],
            'completed': data.get('completed', False),
            'createdAt': timestamp,
            'updatedAt': timestamp
        }

        table.put_item(Item=todo)
        return {"statusCode": 201, "body": todo}
    except Exception as e:
        logger.exception("Failed to create todo")
        raise


@validator(inbound_schema=TODO_SCHEMA)
@app.put("/v2/todos/<todo_id>")
@tracer.capture_method
def update_todo(todo_id: str):
    try:
        data = app.current_event.json_body
        timestamp = datetime.utcnow().isoformat()

        response = table.update_item(
            Key={'id': todo_id},
            UpdateExpression='SET title = :title, completed = :completed, updatedAt = :updatedAt',
            ExpressionAttributeValues={
                ':title': data['title'],
                ':completed': data.get('completed', False),
                ':updatedAt': timestamp
            },
            ReturnValues='ALL_NEW'
        )

        return {"statusCode": 200, "body": response.get('Attributes')}
    except Exception as e:
        logger.exception(f"Failed to update todo {todo_id}")
        raise


@app.delete("/v2/todos/<todo_id>")
@tracer.capture_method
def delete_todo(todo_id: str):
    try:
        table.delete_item(Key={'id': todo_id})
        return {"statusCode": 204, "body": ""}
    except Exception as e:
        logger.exception(f"Failed to delete todo {todo_id}")
        raise


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: APIGatewayProxyEvent, context: LambdaContext) -> Dict[str, Any]:
    try:
        return app.resolve(event, context)
    except Exception as e:
        logger.exception("Error processing request")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal server error"})
        }