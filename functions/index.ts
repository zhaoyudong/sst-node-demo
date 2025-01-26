import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { Resource } from "sst";

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = Resource.SSTDemoDB.name

interface Todo {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
}

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // Extract the actual resource ID from the path
        const pathParts = event.path.split('/');
        const resourceId = pathParts[pathParts.length - 1] !== 'todos' ? pathParts[pathParts.length - 1] : undefined;

        if (!event.path.startsWith('/v1/todos')) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Not found' }),
            };
        }

        switch (event.httpMethod) {
            case 'GET':
                if (resourceId) {
                    return await getTodo(resourceId);
                }
                return await listTodos();

            case 'POST':
                return await createTodo(JSON.parse(event.body || '{}'));

            case 'PUT':
                if (!resourceId) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Missing ID' }),
                    };
                }
                return await updateTodo(resourceId, JSON.parse(event.body || '{}'));

            case 'DELETE':
                if (!resourceId) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Missing ID' }),
                    };
                }
                return await deleteTodo(resourceId);

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Unsupported method' }),
                };
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
};

async function listTodos(): Promise<APIGatewayProxyResult> {
    const result = await dynamodb
        .scan({
            TableName: TABLE_NAME,
        })
        .promise();

    return {
        statusCode: 200,
        body: JSON.stringify(result.Items),
    };
}

async function getTodo(id: string): Promise<APIGatewayProxyResult> {
    const result = await dynamodb
        .get({
            TableName: TABLE_NAME,
            Key: { id },
        })
        .promise();

    if (!result.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Todo not found' }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result.Item),
    };
}

async function createTodo(data: Partial<Todo>): Promise<APIGatewayProxyResult> {
    const timestamp = new Date().toISOString();
    const todo: Todo = {
        id: uuidv4(),
        title: data.title || '',
        completed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await dynamodb
        .put({
            TableName: TABLE_NAME,
            Item: todo,
        })
        .promise();

    return {
        statusCode: 201,
        body: JSON.stringify(todo),
    };
}

async function updateTodo(
    id: string,
    data: Partial<Todo>
): Promise<APIGatewayProxyResult> {
    const timestamp = new Date().toISOString();

    const result = await dynamodb
        .update({
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: 'SET title = :title, completed = :completed, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':title': data.title,
                ':completed': data.completed,
                ':updatedAt': timestamp,
            },
            ReturnValues: 'ALL_NEW',
        })
        .promise();

    return {
        statusCode: 200,
        body: JSON.stringify(result.Attributes),
    };
}

async function deleteTodo(id: string): Promise<APIGatewayProxyResult> {
    await dynamodb
        .delete({
            TableName: TABLE_NAME,
            Key: { id },
        })
        .promise();

    return {
        statusCode: 204,
        body: '',
    };
}