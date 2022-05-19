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

type ContractSubscribeEventParams = {
  contract: string;
  event: string;
  handler: Function;
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

class Subscription {
  subscription: any;
  running: boolean = false;
  unsubscribed: Boolean = false;
  observers: Function[] = [];

  constructor(subscriptionContractEvent: Function) {
    this.subscription = subscriptionContractEvent;
  }

  async runSubscriptionLoop() {
    if (this.running) {
      return;
    }

    this.running = true;

    do {
      const _payload = await this.subscription();
      this.observers.forEach((handler) => {
        handler(_payload);
      });
    } while (!this.unsubscribed);
  }

  async subscribe(handler: Function) {
    this.observers.push(handler);
    this.runSubscriptionLoop();
  }

  unsubscribe(handler: Function) {
    const index = this.observers.indexOf(handler);
    if (index === -1) {
      return;
    }

    this.observers.splice(index, 1);

    if (!this.observers.length) {
      this.unsubscribed = true;
      this.running = false;
      this.subscription.unsubscribe();
    }
  }
}

const subscriptions: Record<string, Record<string, Subscription>> = {};
export async function subscribe({
  contract,
  event,
  handler,
}: ContractSubscribeEventParams): Promise<Subscription> {
  if (!subscriptions[contract]) {
    subscriptions[contract] = {};
  }
  let subscription = subscriptions[contract][event];
  if (!subscription || subscription.unsubscribed) {
    const subscriptionContractEvent = await windowWithPoint.point.contract.subscribe({
      contract,
      event,
    });
    subscription = subscriptions[contract][event] = new Subscription(subscriptionContractEvent);
  }
  subscription.subscribe(handler);
  return subscription;
}
