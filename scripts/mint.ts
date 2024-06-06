import dotenv from "dotenv";
import { ethers } from "hardhat";
import { Manifest, uploadManifest } from "./manifest";
import { NETWORKS, ChainId } from "@human-protocol/sdk";

dotenv.config();

const CAMPAIGN_EXCHANGES = ["binance", "bitfinex", "mexc"];

async function main() {
  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkData = NETWORKS[Number(network.chainId) as ChainId];
  const mintOnly = process.env.MINT_ONLY === "true";

  if (!process.env.HUMAN_USD_ADDRESS) {
    throw new Error("HumanUSD is not found.");
  }

  const humanUSD = await ethers.getContractAt(
    "HumanUSD",
    process.env.HUMAN_USD_ADDRESS
  );

  if (!networkData?.hmtAddress) {
    throw new Error("HMT is not found.");
  }

  let url, hash;
  if (!mintOnly) {
    const startBlock = Math.floor(new Date().getTime() / 1000);
    const duration = +(process.env.CAMPAIGN_DURATION || "2592000");
    const endBlock = startBlock + duration;

    const manifest: Manifest = {
      chainId: Number(network.chainId),
      requesterAddress: await humanUSD.getAddress(),
      exchangeName:
        CAMPAIGN_EXCHANGES[
          Math.floor(Math.random() * CAMPAIGN_EXCHANGES.length)
        ],
      token: await humanUSD.symbol(),
      fundAmount: ethers
        .parseEther(process.env.FUND_AMOUNT || "0.000001")
        .toString(),
      startBlock,
      endBlock,
      duration,
      type: "MARKET_MAKING",
    };

    console.log("Manifest:", manifest);

    console.log("Uploading manifest...");
    const manifestRes = await uploadManifest(manifest);
    url = manifestRes.url;
    hash = manifestRes.hash;
    console.log("Manifest uploaded:", url);
  }

  const mintAmount = ethers.parseEther(process.env.MINT_AMOUNT || "1");

  if (!process.env.USDT_ADDRESS) {
    throw new Error("USDT is not found.");
  }

  const usdt = await ethers.getContractAt("MockUSDT", process.env.USDT_ADDRESS);
  await usdt.approve(await humanUSD.getAddress(), mintAmount);

  console.log("Minting tokens...");

  let txResponse;
  if (mintOnly) {
    txResponse = await humanUSD["mint(address,uint256)"](
      await owner.getAddress(),
      mintAmount
    );
  } else {
    if (!url || !hash) {
      throw new Error("Manifest not uploaded");
    }

    txResponse = await humanUSD["mint(address,uint256,string,string)"](
      await owner.getAddress(),
      mintAmount,
      url,
      hash
    );
  }

  console.log("Tokens minted");

  if (!mintOnly) {
    console.log("Checking the market making campaign...");
    const txReceipt = await txResponse.wait();
    let escrowAddress;
    for (const event of txReceipt?.logs ?? []) {
      if (
        (event as any).fragment &&
        (event as any).fragment.name === "CampaignLaunched"
      ) {
        escrowAddress = (event as any).args?.[3];
      }
    }

    const escrow = await ethers.getContractAt("Escrow", escrowAddress);
    console.log("\n---------------- Escrow Data ----------------");
    console.log("Escrow:", escrowAddress);
    console.log("Token:", await escrow.token());
    console.log("Balance:", await escrow.getBalance());
    console.log("Status:", await escrow.status());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
