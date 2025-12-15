import type { APIGatewayProxyResultV2 } from "aws-lambda";

export const ok = (data: any): APIGatewayProxyResultV2 => {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(data),
  };
};

export const notOk400 = (error: any): APIGatewayProxyResultV2 => {
  return {
    statusCode: 400,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({ error }),
  };
};

export const notOk401 = (error: any): APIGatewayProxyResultV2 => {
  return {
    statusCode: 401,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({ error }),
  };
};

export const notOk403 = (error: any): APIGatewayProxyResultV2 => {
  return {
    statusCode: 403,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({ error }),
  };
};

export const notOk404 = (error: any): APIGatewayProxyResultV2 => {
  return {
    statusCode: 404,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({ error }),
  };
};

export const notOk500 = (error: any): APIGatewayProxyResultV2 => {
  return {
    statusCode: 500,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    }),
  };
};
