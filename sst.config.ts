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


        api.route("GET /", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("GET /{id}", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("POST /", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("PUT /{id}", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.route("DELETE /{id}", {
            handler: "functions/index.handler",
            link: [database]
        });

        api.deploy();

        return {
            api: api.url
        }

    },
});
