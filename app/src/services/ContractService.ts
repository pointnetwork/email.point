const windowWithPoint = window as unknown as WindowWithPoint;

type ContractCallParams = {
  contract: string;
  method: string;
  params?: any[];
};

type ContractGetEventsParams = {
  contract: string;
  event: string;
  filter: Record<string, any>;
};

type Event = {
  address: string;
  blockHash: string;
  blockNumber: number;
  event: string;
  id: string;
  logIndex: number;
  returnValues: Record<any, any>;
};

type ContractCallResponse = {
  blockHash: string;
  blockNumber: number;
  cumulativeGasUsed: number;
  events: Record<string, Event>;
};

export async function callContract({ contract, method, params }: ContractCallParams): Promise<any> {
  const { data } = await windowWithPoint.point.contract.call({
    contract,
    method,
    params,
  });
  return data;
}

export async function sendContract({
  contract,
  method,
  params,
}: ContractCallParams): Promise<ContractCallResponse> {
  const { data } = await windowWithPoint.point.contract.send({
    contract,
    method,
    params,
  });
  return data;
}

export async function getEvents({
  contract,
  event,
  filter,
}: ContractGetEventsParams): Promise<any> {
  const response = await windowWithPoint.point.contract.events({
    contract,
    event,
    filter,
  });
  return response;
}
