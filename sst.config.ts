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

        // TODO: Be careful that the stage may be inconsistent if the stack can not deployed properly
        api.route("ANY /v1/{proxy+}", {
            handler: "functions/index.handler",
            link: [database]
        });


        api.route("ANY /v2/{proxy+}", {
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
