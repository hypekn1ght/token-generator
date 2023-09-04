import { Squid, TokenData, ChainData, ChainName } from "@0xsquid/sdk";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {

  //************ WATCH OUT QUOTE ONLY */
  const quoteOnly = false;
  const integratorID = "trustwallet-api"; //""
  //************ WATCH OUT QUOTE ONLY */
  
  // instantiate the SDK
  const squid = new Squid();

  squid.setConfig({
    baseUrl: "https://api.squidrouter.com", // for mainnet use "https://squid-api-git-main-cosmos-mainnet-0xsquid.vercel.app" "https://testnet.api.squidrouter.com"
    integratorId: integratorID
  });

  // init the SDK
  await squid.init();
  console.log("Squid inited");

  const sourceChain = squid.chains.find(
    c =>
      c.chainName === ChainName.FANTOM
  );
  console.log(`source chain : ${sourceChain?.chainName} , ${sourceChain?.chainId}`);
  
  const destChain = squid.chains.find(
    c =>
      c.chainName === ChainName.AVALANCHE
  );
  console.log(`destination chain : ${destChain?.chainName} , ${destChain?.chainId}`);

  const params = {
    fromChain: sourceChain!.chainId, 
    fromToken: squid.tokens.find(
      t => 
        t.chainId == sourceChain?.chainId &&
        t.symbol == "axlUSDC"
    )!.address, 
    // fromToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    fromAmount: "4000000", // 0.1
    toChain: destChain!.chainId, // 
    toToken: squid.tokens.find(
      t => 
        t.chainId == destChain?.chainId &&
        t.symbol == "axlUSDC"
    )!.address, 
    // toToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    toAddress: "0xE5ebC33267Dda14a1eEFf4d09eaEAF8032f8F188", // the recipient of the trade
    slippage: 1.00, // 1.00 = 1% max slippage across the entire route
    enableForecall: true, // instant execution service, defaults to true
    quoteOnly: quoteOnly, // optional, defaults to false
    // collectFees: {
    //   integratorAddress: "0xE5ebC33267Dda14a1eEFf4d09eaEAF8032f8F188",
    //   fee: 10
    // }
  };
  console.log("starting route gen")
  const { route } = await squid.getRoute(params);
  console.log(`fees: ${JSON.stringify(route.estimate.feeCosts, null, 2)}`);

  console.log(route.estimate.toAmount);

  const PK = process.env.PRIVATE_KEY!;
  if (!PK) console.log(`no PK provided`);
  if (!quoteOnly && PK) {

    // console.log(`token found: ${JSON.stringify(fromToken, null, 2)}`)
    
    const provider = new ethers.providers.JsonRpcProvider(sourceChain?.rpc);
    const signer = new ethers.Wallet(PK, provider);

    const overrides = {
      maxPriorityFeePerGas: ethers.utils.parseUnits("20", "gwei"),
      maxFeePerGas: ethers.utils.parseUnits("300", "gwei"),
    };
    const tx = (await squid.executeRoute({
      signer,
      route,
      overrides
    })) as ethers.providers.TransactionResponse;
    const txReceipt = await tx.wait();

    const axelarScanLink =
      "https://axelarscan.io/gmp/" + txReceipt.transactionHash;
    console.log(
      "Finished! Please check Axelarscan for more details: ",
      axelarScanLink,
      "\n"
    );
  }

})();