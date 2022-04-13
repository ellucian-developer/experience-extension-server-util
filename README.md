# Experience Extension Server Util

This repository is a collection of utility functions useful to creating an Ellucian Experience server endpoints.

For some examples of server microservices which use these utilities, see the Experience Ethos Examples that contains a Lambda and a Node microservice examples.

## Install

```
$ npm install git+https://git.ellucian.com/scm/rang/experience-extension-server-util.git
```

## Prerequisites

### Environment Variables

You must have the following environment variable in place and available when you invoke any of the utilities provided in this project. See below for an example with the `dotenv` JavaScript utility.

```
# .env
ETHOS_INTEGRATION_URL="https://integrate.elluciancloud.com"
```


## Experience Util

### getCardServerConfiguration({ jwt?, token, url? })

Retrieves Card Server Configuration from Experience using the URL passed from Experience in the Extension `jwt` or optionally from the `url` parameter. Either the `jwt` or the `url` must be used. The `token` is the Experience Extension API Token from Experience Setup - Extension Management. This API Token can be generated when configuring the extension.


```
import { experienceUtil } from '@ellucian/experience-extension-server-util'

...
    const extensionApiToken = process.env.EXTENSION_API_TOKEN
    const { config, error } = await experienceUtil.getCardServerConfiguration({
        jwt,
        token: extensionApiToken
    }) 
...
```


## Express Util

### jwtAuthorize({ options: { secret, ignoreExpiration? } })

Provides an Express middleware that verifies the Experience JWT passed in the Authorization header. The decoded JWT is added the the request as `request.jwt`.

`options` must include a `secret` and optionally include the `ignoreExpiration` flag.

```
import { expressUtil } from '@ellucian/experience-extension-server-util';

...
apiRouter.use(expressUtil.jwtAuthorize({ options: { secret: process.env.JWT_SECRET } }));
...
```

```
import { expressUtil } from '@ellucian/experience-extension-server-util';

...
apiRouter.get(
    '/api/endpoint',
    expressUtil.jwtAuthorize({ options: { secret: process.env.JWT_SECRET } }),
    (request, response) => {
        // endpoint code
        ...
    }
);
...

```

## Integration Util

### get({ apiKey?, context?, id?, resource, searchParams?, token?, options?: { ethosIntegrationUrl? } })

Calls a GET on the Integration Proxy API.

`apiKey` is the Ethos API Key to use to request an Ethos token. `apiKey` or `token` is required. These functions will cache the token in the context for subsequent usage. Note it is required in case the cached token expires and a new one is needed

`context` is used to cache any generated token(s). Also contains usage counts - context.ethosGetCount. If `context` is not passed in a `context` will be created and returned.

`id` is optional. It will be added to the resource URL to GET a resource by the GUID.

`resource` name to GET. i.e. 'persons', 'section-registrations', etc.

`searchParams` is a map of search parameters to send with the GET. If there is an Ethos criteria it will be JSON stringified if needed.

`options` is optional. Options can include ethosIntegrationUrl to override using the well known production URL. 

An Ethos Integration `token` can optionally be passed. When not supplied the apiKey will be used to request a token and cache it.

```
import { integrationUtil } from '@ellucian/experience-extension-server-util';

...
    const context = {};

    const {data: sectionRegistrations} = await integrationUtil.get({
        apiKey,
        context,
        resource: 'section-registrations',
        searchParams: {
            criteria: JSON.stringify({
                registrant: {
                    id: personId
                }
            })
        }
    });
```

```
import { integrationUtil } from '@ellucian/experience-extension-server-util';

...
    const context = {};

    const {data: section} = await integrationUtil.get({
        apiKey,
        context,
        id: sectionId,
        resource: 'sections'
    });

```

### getToken({ apiKey, context?, options?, token })

Generates an Ethos Integration token if one is not valid and cached in the context.

`apiKey` is the Ethos API Key to use to request an Ethos token. `apiKey` or `token` is required. These functions will cache the token in the context for subsequent usage. Note it is required in case the cached token expires and a new one is needed

`context` is used to cache any generated token(s). Also contains usage counts - context.ethosGetCount. If `context` is not passed in a `context` will be created and returned.

`options` is optional. Options can include ethosIntegrationUrl to override using the well known production URL. 

An Ethos Integration `token` can optionally be passed. When not supplied the apiKey will be used to request a token and cache it.

```
import { integrationUtil } from '@ellucian/experience-extension-server-util';

...
    const { token } = await getToken({ apiKey, context });
...
```

### graphql({ apiKey?, context?, options?, query, token?, variables? })

`apiKey` is the Ethos API Key to use to request an Ethos token. `apiKey` or `token` is required. These functions will cache the token in the context for subsequent usage. Note it is required in case the cached token expires and a new one is needed

`context` is used to cache any generated token(s). Also contains usage counts - context.ethosGetCount. If `context` is not passed in a `context` will be created and returned.

`query` is a GraphQL query for Ethos Integration graphql endpoint.

`options` is optional. Options can include ethosIntegrationUrl to override using the well known production URL. 

An Ethos Integration `token` can optionally be passed. When not supplied the apiKey will be used to request a token and cache it.

```
import { integrationUtil } from '@ellucian/experience-extension-server-util';

...
    const todaysSections = `
        query todaysSections($personId: ID, $yesterday: Date, $tomorrow: Date){
            sectionRegistrations : sectionRegistrations16(
                filter: {
                    registrant12: {
                        id: {EQ: $personId}
                    }
                    section16: {
                    startOn: {BEFORE: $tomorrow}
                    endOn: {AFTER: $yesterday}
                    }
                }
            ){
                edges {
                    node {
                        sections: section16 {
                        id
                        course: course16 {
                            titles {
                            value
                            }
                            number
                            subject: subject6 {
                            abbreviation
                            }
                        }
                        }
                    }
                }
            }
        }
    `
    const variables = {
        personId,
        yesterday,
        tomorrow
    };
...
    const { data: { sectionRegistrations: { edges: sectionRegistrations } } } =
        await integrationUtil.graphql({ apiKey, context: ethosContext, query: todaysSections, variables });
...
```

## Lambda Util

### buildResponse({ statusCode, headers?, body})

A convienence function to build the Lambda response object.

`statusCode` is the HTTP status code to place in the response.

`headers` is optional and can supply any headers to be in the response HTTP. The Content-Type will default to application/json

`body` is a string or object. If body is not a string it will be JSON stringified.

```
import { StatusCodes } from 'http-status-codes'
import { lambdaUtil } from '@ellucian/experience-extension-server-util'

...
    return lambdaUtil.buildResponse({
        statusCode: StatusCodes.OK,
        body: sections
    })
...
```

### jwtAuthorizeMiddy({ options })

Provides a middy middleware which verifies the Experience JWT passed in the Authorization header. The decoded JWT is added the the request as `request.jwt`.

`options` must include a `secret` and optionally include the `ignoreExpiration` flag.

Note: it is recommended that you include the `httpHeaderNormalizer` middy middleware before the `jwtAuthorizeMiddy`

```
import middy from '@middy/core'
import { lambdaUtil } from '@ellucian/experience-extension-server-util'

...
export const handler = middy(yourFunctionHandler)

handler.use(httpHeaderNormalizer())
handler.use(httpErrorHandler())
handler.use(lambdaUtil.jwtAuthorizeMiddy({ options: { secret: process.env.JWT_SECRET } }))
```

Copyright 2021–2022 Ellucian Company L.P. and its affiliates.
