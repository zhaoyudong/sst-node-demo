/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: "sst-node-demo",
            removal: input?.stage === "production" ? "retain" : "remove",
            protect: ["production"].includes(input?.stage),
            home: "aws",
            providers: {
                aws: {
                    profile: "zhaoyudong.me"
                }
            }
        };
    },
    async run() {
        const database = new sst.aws.Dynamo("SSTDemoDB", {
            fields: {
                id: "string",
            },
            primaryIndex: {
                hashKey: "id",
            },
        });

        const api = new sst.aws.ApiGatewayV1("SSTDemoApi");


        api.route("POST /v1/todos", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("GET /v1/todos/{id}", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("GET /v1/todos", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("PUT /v1/todos/{id}", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("DELETE /v1/todos/{id}", {
            handler: "functions/index.handler",
            link: [database]
        });


        api.route("POST /v2/todos", {
            runtime: "python3.9",
            handler: "python_function/handler.lambda_handler",
            link: [database],
            environment: {
                TABLE_NAME: database.name
            }
        });

        api.route("GET /v2/todos", {
            runtime: "python3.9",
            handler: "python_function/handler.lambda_handler",
            link: [database],
            environment: {
                TABLE_NAME: database.name
            }
        });

        api.deploy();

        return {
            api: api.url
        }

    },
});
