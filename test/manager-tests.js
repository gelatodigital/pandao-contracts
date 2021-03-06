const { expect } = require("chai");
const ethers = require("ethers");
const bre = require("@nomiclabs/buidler").ethers;
const { deployments } = require("@nomiclabs/buidler");

const storageFormat = require("./utils/deployment").storageFormat;

describe("PanDAO Contract Network: Manager Contract", () => {
  let Manager;
  let manager;

  let EternalStorage;
  let eternalStorage;

  let MockToken;
  let mockToken;

  let agent;
  let address1;
  let address2;

  const nullRecord = "0x0000000000000000000000000000000000000000";

  beforeEach(async () => {
    [agent, address1, address2] = await bre.getSigners();

    await deployments.fixture();

    // setup needed contracts
    Manager = await deployments.get("Manager");
    manager = new ethers.Contract(Manager.address, Manager.abi, agent);

    EternalStorage = await deployments.get("EternalStorage");
    eternalStorage = new ethers.Contract(EternalStorage.address, EternalStorage.abi, agent);

    MockToken = await bre.getContractFactory("Token");
    mockToken = await MockToken.deploy();
    await mockToken.deployed();
  });

  it("Manager is stored in EternalStorage", async () => {
    expect(
      await eternalStorage.functions.getAddress(
        storageFormat(["string", "address"], ["contract.address", Manager.address])
      )
    ).to.equal(Manager.address);
  });

  it("Can get contract address by contract name", async () => {
    expect(
      await eternalStorage.functions.getAddress(
        storageFormat(["string", "string"], ["contract.name", "Manager"])
      )
    ).to.equal(Manager.address);
  });

  it("Agent owns deployed Manager contract", async () => {
    expect(
      await eternalStorage.functions.getAddress(
        storageFormat(["string", "address"], ["contract.owner", Manager.address])
      )
    ).to.equal(await agent.getAddress());
  });

  it("Can create an Insurance Pool if it doesn't exist", async () => {
    const ip = await manager.functions.createInsurancePool(mockToken.address, "BTC++", 5, 2);
    const insurancePoolAddress = await eternalStorage.functions.getAddress(
      storageFormat(["string", "address"], ["insurance.pool.address", mockToken.address])
    );

    expect(ip).to.have.property("hash");
    expect(
      await eternalStorage.functions.getAddress(
        storageFormat(["string", "address"], ["insurance.pool.address", mockToken.address])
      )
    ).to.equal(insurancePoolAddress);

    expect(
      await eternalStorage.functions.getAddress(
        storageFormat(["string", "address"], ["insurance.pool.liquidityToken", mockToken.address])
      )
    )
      .to.be.an("string")
      .that.does.not.include(nullRecord);

    expect(
      await eternalStorage.functions.getAddress(
        storageFormat(["string", "address"], ["insurance.pool.claimsToken", mockToken.address])
      )
    )
      .to.be.an("string")
      .that.does.not.include(nullRecord);

    expect(
      await eternalStorage.functions.getAddress(
        storageFormat(["string", "address"], ["insurance.pool.insuredAsset", mockToken.address])
      )
    ).to.equal(mockToken.address);

    expect(
      await eternalStorage.functions.getUint(
        storageFormat(["string", "address"], ["insurance.pool.insureeFeeRate", mockToken.address])
      )
    ).to.equal(5);

    expect(
      await eternalStorage.functions.getUint(
        storageFormat(["string", "address"], ["insurance.pool.serviceFeeRate", mockToken.address])
      )
    ).to.equal(2);
  });

  it("Fails to create Insurance Pool if it already exists", async () => {
    const originalPool = await manager.functions.createInsurancePool(
      mockToken.address,
      "BTC++",
      5,
      2
    );
    const duplicatePool = await expect(
      manager.functions.createInsurancePool(mockToken.address, "BTC++", 5, 2)
    ).to.be.revertedWith("PanDAO: Insurance Pool already exists for that asset");
  });

  it("Fails to create an Insurance Pool if not Agent", async () => {
    notAgentSigner = new ethers.Contract(Manager.address, Manager.abi, address1);

    await expect(
      notAgentSigner.functions.createInsurancePool(mockToken.address, "BTC++", 5, 2)
    ).to.be.revertedWith("PanDAO: UnAuthorized - Agent only");
  });
});
