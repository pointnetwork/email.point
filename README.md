# Email Example Zapp

Welcome to the Email Example Zapp. This README is a basic guide to getting started with this application.

You can find the frontend code in the ```./app``` folder and the smart contract in the ```./contracts```.

## Prepare for deployment

Since the Smart Contract used in this application uses `@openzeppelin/contracts` you must install the dependencies first before you deploy to the site to the network.

Run ```yarn``` in the parent directory

## Deploy the smart contract

Run this command from the [pointnetwork](https://github.com/pointnetwork/pointnetwork) folder:
```sh
BLOCKCHAIN_HOST=localhost point-deploy ../zapps/email.point --contracts
```

## Compile the zApp code

Go to ```./app``` and run:
1. ```yarn```
2. ```yarn build```

## Deploy the zApp

Start your local Point Node and deploy the Zapp by following the instructions [here](https://pointnetwork.github.io/docs/build-run-dev-node-and-services).