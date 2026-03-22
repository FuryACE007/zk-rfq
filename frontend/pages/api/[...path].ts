import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:4000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, body, query } = req;
    const path = (query.path as string[]).join('/');
    const url = `${GATEWAY_URL}/${path}`;

    const response = await axios({
      method: method as string,
      url,
      data: body,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res
        .status(503)
        .json({ error: 'Gateway unreachable', details: String(error) });
    }
  }
}
