import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import env from '../config';
import logger from '../loaders/logger';

const axiosClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosRetry(axiosClient, {
  retries: env.MAX_API_REQUEST_RETRIES,
  retryDelay: (retryCount) => {
    return axiosRetry.exponentialDelay(retryCount);
  },
  retryCondition: (error: AxiosError) => {
    return error.response ? error.response.status === 429 : false;
  },
});

interface ApiRequestParams {
  url: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  provider: 'birdeye' | 'solanaTracker';
  API_KEY: string;
}

const makeApiRequest = async ({
  url,
  method,
  headers = {},
  body = undefined,
  params = {},
  provider,
  API_KEY,
}: ApiRequestParams): Promise<AxiosResponse<any> | undefined> => {
  const requestConfig: AxiosRequestConfig = {
    url,
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
      'x-api-key': API_KEY,
    } as Record<string, string>,
    data: body,
    params,
  };

  try {
    const response = await axiosClient(requestConfig);
    return response;
  } catch (error: unknown) {
    // Type guard for error
    if (error instanceof Error) {
      logger.error('API Request failed:', {
        message: error.message,
        ...(axios.isAxiosError(error) &&
          error.response && {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
          }),
      });
    } else {
      // Handle case when error is not an Error object
      logger.error('API Request failed with unknown error', {
        error: String(error),
      });
    }
    if (axios.isAxiosError(error)) {
      logger.error('API Request failed:', {
        message: error.message,
        ...(error.response && {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        }),
      });
    } else {
      logger.error('Unexpected error:', error);
    }
    return undefined;
  }
};

export default makeApiRequest;
