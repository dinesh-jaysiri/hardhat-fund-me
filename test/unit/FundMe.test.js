const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async () => {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async () => {
              //deploy our fundMe contract
              //using Hardhat-deploy
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture("all")
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", () => {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.priceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", async () => {
              it("Fails if you don't send enough ETH", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Didn't send enough!"
                  )
              })

              it("updated the amount funded data structre", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.addressToAmountFunded(deployer)
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("Add funder to array of funders", async () => {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.funders(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("Withdraw", async () => {
              beforeEach(async () => {
                  await fundMe.fund({
                      value: sendValue,
                  })
              })

              it("Withdraw ETH from a single founder", async () => {
                  //arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //act
                  const transectionResponse = await fundMe.withdraw()
                  const transectionRisipt = await transectionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transectionRisipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //assert

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("allows us to withdraw with multiple funders", async () => {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )

                      await fundMeConnectedContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //act
                  const transectionResponse = await fundMe.withdraw()
                  const transectionRisipt = await transectionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transectionRisipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  //Make sure that the funders are reset properly

                  await expect(fundMe.funders(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.addressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("only allow to owner to withdraw funds", async () => {
                  const accounts = await ethers.getSigners()
                  const attaker = accounts[1]
                  const attakerConnectCantract = await fundMe.connect(attaker)
                  await expect(
                      attakerConnectCantract.withdraw()
                  ).to.be.revertedWith("FundMe_NotOwner")
              })
          })
      })
