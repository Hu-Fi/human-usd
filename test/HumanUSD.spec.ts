import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers, upgrades } from "hardhat";

import {
  CampaignManager,
  EscrowFactory,
  HMToken,
  HumanUSD,
  MockUSDT,
  Staking,
} from "../typechain-types";

describe("HumanUSD", () => {
  const tokensRequiredForCampaign = 100000000;
  const minimumStake = ethers.parseEther("2");
  const lockPeriod = 2;

  let operator: Signer;
  let alice: Signer;
  let recordingOracle: Signer;
  let reputationOracle: Signer;
  let exchangeOracle: Signer;

  const recordingOracleFee = 5;
  const reputationOracleFee = 5;
  const exchangeOracleFee = 5;

  const manifestURL = "https://example.com/manifest.json";
  const manifestHash =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  const fundAmount = ethers.parseEther("1");

  let usdt: MockUSDT;
  let hmtoken: HMToken;
  let staking: Staking;
  let escrowFactory: EscrowFactory;

  let humanUSD: HumanUSD;
  let campaignManager: CampaignManager;

  before(async () => {
    [, operator, alice, recordingOracle, reputationOracle, exchangeOracle] =
      await ethers.getSigners();

    // Deploy MockUSDT contract
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy(ethers.parseEther("10000000000"));

    // Deploy HMTToken Contract
    const HMToken = await ethers.getContractFactory("HMToken");
    hmtoken = (await HMToken.deploy(
      ethers.parseEther("10000000000"),
      "Human Token",
      18,
      "HMT"
    )) as HMToken;

    // Deploy Staking Conract
    const Staking = await ethers.getContractFactory("Staking");
    staking = (await upgrades.deployProxy(
      Staking,
      [await hmtoken.getAddress(), minimumStake, lockPeriod],
      { kind: "uups", initializer: "initialize" }
    )) as unknown as Staking;

    // Deploy Escrow Factory Contract
    const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
    escrowFactory = (await upgrades.deployProxy(
      EscrowFactory,
      [await staking.getAddress()],
      { kind: "uups", initializer: "initialize" }
    )) as unknown as EscrowFactory;

    // Deploy HumanUSD
    const HumanUSD = await ethers.getContractFactory("HumanUSD");
    humanUSD = (await upgrades.deployProxy(
      HumanUSD,
      [
        await usdt.getAddress(),
        await hmtoken.getAddress(),
        await escrowFactory.getAddress(),
        await staking.getAddress(),
        tokensRequiredForCampaign,
      ],
      { kind: "uups", initializer: "initialize" }
    )) as unknown as HumanUSD;

    // Deploy CampaignManager
    const CampaignManager = await ethers.getContractFactory("CampaignManager");
    campaignManager = (await upgrades.deployProxy(CampaignManager, [], {
      kind: "uups",
      initializer: "initialize",
    })) as unknown as CampaignManager;

    // Set Campaign Data
    await campaignManager.setCampaignData(
      await recordingOracle.getAddress(),
      await reputationOracle.getAddress(),
      await exchangeOracle.getAddress(),
      recordingOracleFee,
      reputationOracleFee,
      exchangeOracleFee,
      manifestURL,
      manifestHash
    );

    // Add Campaign Tier
    await campaignManager.addCampaignTier(
      await hmtoken.getAddress(),
      fundAmount
    );

    // Deposit HMT to HumanUSD for two campaigns.
    await hmtoken.transfer(await humanUSD.getAddress(), ethers.parseEther("2"));
  });

  it("should have correct name, and symbol", async () => {
    expect(await humanUSD.name()).to.equal("HumanUSD");
    expect(await humanUSD.symbol()).to.equal("HUSD");
  });

  it("should not be able to mint from operator", async () => {
    await expect(
      humanUSD
        .connect(operator)
        .mint(alice.getAddress(), tokensRequiredForCampaign)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should be able to mint without launching campaign", async () => {
    await usdt.approve(await humanUSD.getAddress(), tokensRequiredForCampaign);
    await humanUSD.mint(alice.getAddress(), tokensRequiredForCampaign);

    expect(await humanUSD.balanceOf(alice.getAddress())).to.equal(
      tokensRequiredForCampaign
    );
  });

  it("should not be able to set campaign manager from operator", async () => {
    await expect(
      humanUSD
        .connect(operator)
        .setCampaignManager(await campaignManager.getAddress())
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should be able to set campaign manager", async () => {
    await humanUSD.setCampaignManager(await campaignManager.getAddress());

    expect(await humanUSD.campaignManager()).to.equal(
      await campaignManager.getAddress()
    );
  });

  it("should be able to mint before reaching tokens required for campaign", async () => {
    const aliceBalanceBefore = await humanUSD.balanceOf(alice.getAddress());

    const tokensSmallerThanRequired = BigInt(tokensRequiredForCampaign * 0.5);
    await usdt.approve(await humanUSD.getAddress(), tokensSmallerThanRequired);
    await humanUSD.mint(alice.getAddress(), tokensSmallerThanRequired);

    expect(await humanUSD.balanceOf(alice.getAddress())).to.equal(
      aliceBalanceBefore + tokensSmallerThanRequired
    );
  });

  it("should not be able to mint after reaching tokens required for campaign without staking hmtokens", async () => {
    await usdt.approve(await humanUSD.getAddress(), tokensRequiredForCampaign);
    await expect(
      humanUSD.mint(alice.getAddress(), tokensRequiredForCampaign)
    ).to.be.revertedWith("Needs to stake HMT tokens to create an escrow.");
  });

  it("should not be able to stake HMTokens from operator", async () => {
    await hmtoken.approve(await humanUSD.getAddress(), minimumStake);

    await expect(
      humanUSD.connect(operator).stakeHMT(minimumStake)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should be able to stake HMTokens", async () => {
    await hmtoken.approve(await humanUSD.getAddress(), minimumStake);
    await humanUSD.stakeHMT(minimumStake);

    expect(await staking.hasAvailableStake(await humanUSD.getAddress())).to.be
      .true;
  });

  it("should be able to mint with launching campaign", async () => {
    const aliceBalanceBefore = await humanUSD.balanceOf(alice.getAddress());

    await usdt.approve(await humanUSD.getAddress(), tokensRequiredForCampaign);
    const txResponse = await humanUSD.mint(
      alice.getAddress(),
      tokensRequiredForCampaign
    );
    expect(txResponse)
      .to.emit(humanUSD, "CampaignLaunched")
      .withArgs(
        "1",
        await hmtoken.getAddress(),
        fundAmount.toString(),
        anyValue
      );

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
    expect(escrowAddress).not.to.be.undefined;
    const escrow = await ethers.getContractAt("Escrow", escrowAddress);
    expect(await escrow.token()).to.equal(await hmtoken.getAddress());
    expect(await escrow.getBalance()).to.equal(fundAmount.toString());
    expect(await escrow.status()).to.equal(1); // Pending

    expect(await humanUSD.balanceOf(alice.getAddress())).to.equal(
      aliceBalanceBefore + BigInt(tokensRequiredForCampaign)
    );
    expect(await hmtoken.balanceOf(await humanUSD.getAddress())).to.equal(
      ethers.parseEther("1")
    );
  });

  it("should launch the campaign until out of HMTokens", async () => {
    const aliceBalanceBefore = await humanUSD.balanceOf(alice.getAddress());

    await usdt.approve(await humanUSD.getAddress(), tokensRequiredForCampaign);
    await humanUSD.mint(alice.getAddress(), tokensRequiredForCampaign);

    expect(await humanUSD.balanceOf(alice.getAddress())).to.equal(
      aliceBalanceBefore + BigInt(tokensRequiredForCampaign)
    );
    expect(await humanUSD.lastCampaignId()).to.equal(2);
    expect(await hmtoken.balanceOf(await humanUSD.getAddress())).to.equal(
      ethers.parseEther("0")
    );
  });

  it("should not launch campaign but mint tokens", async () => {
    const aliceBalanceBefore = await humanUSD.balanceOf(alice.getAddress());

    await usdt.approve(await humanUSD.getAddress(), tokensRequiredForCampaign);
    await humanUSD.mint(alice.getAddress(), tokensRequiredForCampaign);

    expect(await humanUSD.balanceOf(alice.getAddress())).to.equal(
      aliceBalanceBefore + BigInt(tokensRequiredForCampaign)
    );
    expect(await humanUSD.lastCampaignId()).to.equal(2);
    expect(await hmtoken.balanceOf(await humanUSD.getAddress())).to.equal(
      ethers.parseEther("0")
    );
  });
});
