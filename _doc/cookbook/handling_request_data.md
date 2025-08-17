# Handling request data

## What will you see?

Here we will see how to get the data the server receives when a request is made.  
There is more than one source of data, since there is:
- Data coming from the URL:
    - The query string: https://my-site/ `?sort=asc&filter=jopi`.
    - A part of the URL which can be used as a parameter: https://my-site/category/ `programming` / listing
- Data coming from POST and PUT requests, which can be HTML, plain text, JSON or FormData

## JopiRequest.getReqData

### What is it?

Thanks to the `getReqData` method, obtaining incoming data is really simple because it will automatically aggregate all the data received.
It will take all sources of data (those mentioned in the introduction) and merge them together, without needing to know exactly where the data comes from.

```typescript title="Sample of using getReqData"
myWebSite.onPOST("/", async req => {
    const myData = await req.getReqData();

    // Return the result as-is.
    return req.jsonResponse(myData);
});
```

### Our test laboratory

Here we will create a test laboratory to experiment with the `getReqData` function.

#### The server app

Here is the complete code for the server. What it does is very simple: it calls `getReqData` and then returns the received data as a JSON response.
We do this for several types of requests.

```typescript title="The server app"
import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

myWebSite.onGET("/", async req => {
    const myData = await req.getReqData();
    return req.jsonResponse(myData);
});

myWebSite.onPOST("/", async req => {
    const myData = await req.getReqData<any>();

    // Handle the file.
    if (myData["myFile"] && (myData["myFile"] instanceof Blob)) {
        myData["myFile"] = await (myData["myFile"] as Blob).text();
    }

    return req.jsonResponse(myData);
});

myWebSite.onGET("/category/:category/list", async req => {
    const myData = await req.getReqData();
    return req.jsonResponse(myData);
});

myWebSite.onPOST("/category/:category/list", async req => {
    const myData = await req.getReqData();
    return req.jsonResponse(myData);
});
```

#### The test client app

GET requests can be tested from a browser by entering the URL. However, we will need a tool for POST requests, requests receiving JSON, requests receiving a form, and those receiving a file. That's why we need a test application, which is the purpose of the following script. This is also a BunJS application. Since it has no dependencies, just create the file and run `bun ./testApp.ts`

```typescript title="The test app testApp.ts"

// doFetch does a fetch to call the server and print the result.
async function doFetch(method: string, url: string, body?: any, contentType?: string) {
    // If object, then transform it to string.
    if (body && (!(body instanceof FormData)) && (typeof (body) !== "string")) body = JSON.stringify(body);

    let headers: any = {};
    if (contentType) headers["Content-Type"] = contentType;

    const res = await fetch(url, {method, body, headers});
    if (!res.ok) { console.log("❌ Error with request", "[" + method + "]", url); return; }
    console.log("👍 Result of request ", "[" + method + "]", url, "-->", await res.json());
}

async function testGET() {
    console.log("Test GET --->");

    // The most basic case.
    await doFetch("GET", "http://127.0.0.1/");

    // Using query-string as data.
    await doFetch("GET", "http://127.0.0.1/?hello=world&a=b&c=d");

    // Using url part as data.
    await doFetch("GET", "http://127.0.0.1/category/programming/list");

    // For security reasons, url part has priority over the query-string.
    await doFetch("GET", "http://127.0.0.1/category/programming/list?category=idonthavepriority");
}

async function testPOST() {
    console.log("Test POST --->");

    // The most basic case.
    await doFetch("POST", "http://127.0.0.1/");
}

async function testJson() {
    console.log("Test Json --->");

    // Sending json data.
    await doFetch("POST", "http://127.0.0.1/", {hello: "world", a: "jsonA", b: "jsonB"}, "application/json");

    // The body data has priority.
    await doFetch("POST", "http://127.0.0.1/?hello=world&a=b&c=d", {hello: "world", a: "jsonA", b: "jsonB"});
}

async function testFormData() {
    console.log("Test FormData --->");

    const formData = new FormData();
    formData.append("hello", 'world');
    formData.append("a", 'formA');
    formData.append("b", 'formB');

    await doFetch("POST", "http://127.0.0.1/", formData);

    // The form data has priority.
    await doFetch("POST", "http://127.0.0.1/?hello=world&a=b&c=d", formData);
}

async function testSendingFile() {
    const myFile = new File(["the content of my file"], "test.txt", {type: "text/plain"});

    const formData = new FormData();
    formData.append("myFile", myFile);
    await doFetch("POST", "http://127.0.0.1/", formData);
}

async function test() {
    //await testGET();
    //await testPOST();
    //await testJson();
    //await testFormData();
    await testSendingFile();

}

test().then();
```

### Priority order

As you may have seen in the example, there is a priority order in case of conflict.

- The body data (json or FormData) has the highest priority.
- Then the data contained in the URL path.
- Then the data from the query-string.

## JopiRequest.urlParts

`urlParts` allows transforming some parts of the url into data.

```typescript title="Sample"
// Note that here we have ":" before selectedCategory.
myWebSite.onGET("/category/:selectedCategory/list", async req => {
    const myData = await req.urlParts;
    return req.jsonResponse(myData);
});
```

You can try with the url: http://127.0.0.1/category/programming/list.  
The result will be `{"selectedCategory": "programming"}`.

## JopiRequest.reqBodyAsJson()

`reqBodyAsJson` allows you to get a JSON from the body.
It will throw an error if it's not a JSON content, or if the JSON is invalid.
You can use the property `isReqBodyJson` which allows you to know if the request body is a JSON.

## JopiRequest.reqBodyAsFormData()

`reqBodyAsFormData` allows you to get a FormData from the body.
It will throw an error if it's not a FormData content, or if the body content is invalid.
You can use the property `isReqBodyFormData` which allows you to know if the request body is a FormData.