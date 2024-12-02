## D' title

### Project setup

`npm install`

Add `.env` file, see `.env.example`. Requires some api keys, so just ask me for the full thing, I guess.

`docker compose up -d`

`npm run db-seed`

`npm run start:dev`

### Bot testing

Open `@SkibidiSwag_bot` in telegram. You'll know it's the right one, since it has `(real)` in the name. 

Register, using `/register` to create a new account or `/registerwith` to import an existing one. It's recommended to use `Sepolia` for testing.

Add assets to the account, if necessary. For testnet:

    Sepolia faucet: 
    https://cloud.google.com/application/web3/faucet

    Wrap ETH:
    https://sepolia.etherscan.io/token/0xfff9976782d46cc05630d1f6ebab18b2324d6b14#writeContract

Add tokens to the bot, using `/addtoken`. `WETH` and `USDT` recommended.

Check balance by running `/balance` command.

Subscribe to address's swaps, using `/follow`. You can use a second account, added to `Metamask` wallet, for ease of testing. The third argument, subscription swap limit, can be set to `0`, if you want to disable it. The subscription can be updated by running `/follow` command with the same address or removed with `/unfollow`.

Swap, using `/swapwith` with the second account's private key. Uniswap afaik does not provide interface for swaps on Sepolia. If you're using mainnet BNB or Polygon, you can do it with uniswap app. Wait for the swap and reswap confirmations. Both may take some time, but usually under 30 seconds. `/balance` command may return old values right after, so wait a couple seconds before requesting.

The rest of the commands(`/swap`, `/send`, etc) are self-explanatory. `/switch` isn't properly tested, but should work. Each chain has its own tokens & subscriptions, otherwise they should work the same.

### Web testing

Web client is only provided as a poc. The only implemented command is `/balance`(the rest can be added in the same manner). To get the balance, navigate to `http://localhost:3000/user/${chatId}/balance`. `chatId` can be obtained by running `/chatid` command. You can also subscribe to your repeated swap notifications by navigating to `http://localhost:3000` and using the same `chatId`. Notifications will be pushed both to telegram's chat and web interface - you can check it by running `/swapwith`, as described above.
