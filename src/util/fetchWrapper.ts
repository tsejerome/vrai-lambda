import { AxiosResponse } from 'axios';
import axios from 'axios'
// const axios = require('axios').default;

export enum MethodType {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  // DELETE = 'DELETE'
}

const fetchWrapper = async (url: string, method: MethodType, body?: string): Promise<unknown> => {
  try {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const data = {
      url,
      method,
      headers,
      data: body,
    }
    const response: AxiosResponse = await axios(data);
    if (response.status >= 300) throw response.data;
    return response.data;
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
};

export default fetchWrapper;
