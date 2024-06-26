import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { CampaignManager } from "../typechain-types";
import { Signer } from "ethers";

describe("CampaignManager", () => {
  let campaignManager: CampaignManager;

  let operator: Signer;
  let recordingOracle: Signer;
  let reputationOracle: Signer;
  let exchangeOracle: Signer;
  let token1: Signer;
  let token2: Signer;

  const recordingOracleFee = 5;
  const reputationOracleFee = 5;
  const exchangeOracleFee = 5;

  const recordingOracleFeeNew = 10;
  const reputationOracleFeeNew = 10;
  const exchangeOracleFeeNew = 10;

  const tier1Amount = ethers.parseEther("1");
  const tier2Amount = ethers.parseEther("2");

  before(async () => {
    [
      ,
      operator,
      recordingOracle,
      reputationOracle,
      exchangeOracle,
      token1,
      token2,
    ] = await ethers.getSigners();

    // Deploy CampaignManager
    const CampaignManager = await ethers.getContractFactory("CampaignManager");
    campaignManager = (await upgrades.deployProxy(CampaignManager, [], {
      kind: "uups",
      initializer: "initialize",
    })) as unknown as CampaignManager;
  });

  it("should not return campaign to launch without campaign data", async () => {
    await expect(campaignManager.getCampaignTierToLaunch()).to.be.revertedWith(
      "CampaignManager: Invalid campaign data"
    );
  });

  it("should not be able to set campaign data from operator", async () => {
    await expect(
      campaignManager
        .connect(operator)
        .setCampaignData(
          await recordingOracle.getAddress(),
          await reputationOracle.getAddress(),
          await exchangeOracle.getAddress(),
          recordingOracleFee,
          reputationOracleFee,
          exchangeOracleFee
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should be able to set campaign data", async () => {
    await campaignManager.setCampaignData(
      await recordingOracle.getAddress(),
      await reputationOracle.getAddress(),
      await exchangeOracle.getAddress(),
      recordingOracleFee,
      reputationOracleFee,
      exchangeOracleFee
    );

    const campaignData = await campaignManager.campaignData();
    expect(campaignData.recordingOracle).to.equal(
      await recordingOracle.getAddress()
    );
    expect(campaignData.reputationOracle).to.equal(
      await reputationOracle.getAddress()
    );
    expect(campaignData.exchangeOracle).to.equal(
      await exchangeOracle.getAddress()
    );
    expect(campaignData.recordingOracleFeePercentage).to.equal(
      recordingOracleFee.toString()
    );
    expect(campaignData.reputationOracleFeePercentage).to.equal(
      reputationOracleFee.toString()
    );
    expect(campaignData.exchangeOracleFeePercentage).to.equal(
      exchangeOracleFee.toString()
    );
  });

  it("should be able to set campaign data again", async () => {
    await campaignManager.setCampaignData(
      await recordingOracle.getAddress(),
      await reputationOracle.getAddress(),
      await exchangeOracle.getAddress(),
      recordingOracleFeeNew,
      reputationOracleFeeNew,
      exchangeOracleFeeNew
    );

    const campaignData = await campaignManager.campaignData();
    expect(campaignData.recordingOracle).to.equal(
      await recordingOracle.getAddress()
    );
    expect(campaignData.reputationOracle).to.equal(
      await reputationOracle.getAddress()
    );
    expect(campaignData.exchangeOracle).to.equal(
      await exchangeOracle.getAddress()
    );
    expect(campaignData.recordingOracleFeePercentage).to.equal(
      recordingOracleFeeNew.toString()
    );
    expect(campaignData.reputationOracleFeePercentage).to.equal(
      reputationOracleFeeNew.toString()
    );
    expect(campaignData.exchangeOracleFeePercentage).to.equal(
      exchangeOracleFeeNew.toString()
    );
  });

  it("should not return campaign to launch without campaign tier", async () => {
    await expect(campaignManager.getCampaignTierToLaunch()).to.be.revertedWith(
      "CampaignManager: No campaign tier to launch"
    );
  });

  it("should not be able to add campaign tier from operator", async () => {
    await expect(
      campaignManager
        .connect(operator)
        .addCampaignTier(await token1.getAddress(), tier1Amount)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should be able to add campaign tier", async () => {
    await campaignManager.addCampaignTier(
      await token1.getAddress(),
      tier1Amount
    );

    const campaignTier = await campaignManager.campaignTiers(0);
    expect(campaignTier.token).to.equal(await token1.getAddress());
    expect(campaignTier.fundAmount).to.equal(tier1Amount.toString());
  });

  it("should be able to add another campaign tier", async () => {
    await campaignManager.addCampaignTier(
      await token2.getAddress(),
      tier2Amount
    );

    const campaignTier = await campaignManager.campaignTiers(1);
    expect(campaignTier.token).to.equal(await token2.getAddress());
    expect(campaignTier.fundAmount).to.equal(tier2Amount.toString());

    const campaignTierCount = await campaignManager.campaignTierCount();
    expect(campaignTierCount).to.equal("2");
  });

  it("should return campaign to launch with round robin selection", async () => {
    let campaignToLaunch = await campaignManager.getCampaignTierToLaunch();
    expect(campaignToLaunch[0].toString()).to.equal("0");
    expect(campaignToLaunch[1]).to.equal(await token1.getAddress());
    expect(campaignToLaunch[2].toString()).to.equal(tier1Amount.toString());

    await campaignManager.launchCampaignTier();

    campaignToLaunch = await campaignManager.getCampaignTierToLaunch();
    expect(campaignToLaunch[0].toString()).to.equal("1");
    expect(campaignToLaunch[1]).to.equal(await token2.getAddress());
    expect(campaignToLaunch[2].toString()).to.equal(tier2Amount.toString());

    await campaignManager.launchCampaignTier();

    campaignToLaunch = await campaignManager.getCampaignTierToLaunch();
    expect(campaignToLaunch[0].toString()).to.equal("0");
    expect(campaignToLaunch[1]).to.equal(await token1.getAddress());
    expect(campaignToLaunch[2].toString()).to.equal(tier1Amount.toString());
  });

  it("should not be able to remove tier from operator", async () => {
    await expect(
      campaignManager.connect(operator).removeCampaignTier(0)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should be able to remove tier", async () => {
    await campaignManager.removeCampaignTier(0);

    const campaignTier = await campaignManager.campaignTiers(0);
    expect(campaignTier.token).to.equal(ethers.ZeroAddress);
    expect(campaignTier.fundAmount).to.equal("0");
  });

  it("should not be able to remove tier again", async () => {
    await expect(campaignManager.removeCampaignTier(0)).to.be.revertedWith(
      "CampaignManager: Campaign tier not found"
    );
  });

  it("should not include removed tier in round robin selection", async () => {
    const campaignToLaunch = await campaignManager.getCampaignTierToLaunch();
    expect(campaignToLaunch[0].toString()).to.equal("1");
    expect(campaignToLaunch[1]).to.equal(await token2.getAddress());
    expect(campaignToLaunch[2].toString()).to.equal(tier2Amount.toString());

    await campaignManager.launchCampaignTier();

    const campaignToLaunchNew = await campaignManager.getCampaignTierToLaunch();
    expect(campaignToLaunchNew[0].toString()).to.equal("1");
    expect(campaignToLaunchNew[1]).to.equal(await token2.getAddress());
    expect(campaignToLaunchNew[2].toString()).to.equal(tier2Amount.toString());
  });
});
