import { AssertionError, expect } from "chai";
import { ProviderError } from "hardhat/internal/core/providers/errors";

import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
} from "../helpers";

import "../../src";

describe("INTEGRATION: Reverted with custom error", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    // deploy Matchers contract before each test
    let matchers: any;
    beforeEach("deploy matchers contract", async function () {
      const Matchers = await this.hre.ethers.getContractFactory("Matchers");

      matchers = await Matchers.deploy();
    });

    // helpers
    const mineSuccessfulTransaction = async (hre: any) => {
      await hre.network.provider.send("evm_setAutomine", [false]);

      const [signer] = await hre.ethers.getSigners();
      const tx = await signer.sendTransaction({ to: signer.address });

      await hre.network.provider.send("hardhat_mine", []);
      await hre.network.provider.send("evm_setAutomine", [true]);

      return tx;
    };

    describe("calling a method that succeeds", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) =>
            expect(x).not.to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted without a reason",
        });
      });
    });

    describe("calling a method that reverts with a reason string", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with panic code 0x01 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "revertWithAnotherCustomError",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts: expected custom error not to match", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction NOT to be reverted with custom error 'SomeCustomError', but it was",
        });
      });

      it("failed asserts: reverts with another custom error of the same contract", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithAnotherCustomError",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with custom error 'AnotherCustomError'",
        });
      });

      it("failed asserts: reverts with another custom error of another contract", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithAnotherContractCustomError",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with a different custom error",
        });
      });
    });

    describe("with args", function () {
      it("should work with one argument", async function () {
        await expect(matchers.revertWithCustomErrorWithUint(1))
          .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
          .withArgs(1);

        await expect(
          expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(2)
        ).to.be.rejectedWith(AssertionError, "expected 1 to equal 2");
      });

      it("should work with two arguments", async function () {
        await expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
          .to.be.revertedWithCustomError(
            matchers,
            "CustomErrorWithUintAndString"
          )
          .withArgs(1, "foo");

        await expect(
          expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
            .to.be.revertedWithCustomError(
              matchers,
              "CustomErrorWithUintAndString"
            )
            .withArgs(2, "foo")
        ).to.be.rejectedWith(AssertionError, "expected 1 to equal 2");

        await expect(
          expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
            .to.be.revertedWithCustomError(
              matchers,
              "CustomErrorWithUintAndString"
            )
            .withArgs(1, "bar")
        ).to.be.rejectedWith(AssertionError, "expected 'foo' to equal 'bar'");
      });

      // skipped until .deep.equal works with big numbers
      it.skip("should work with nested arguments", async function () {
        await expect(matchers.revertWithCustomErrorWithPair(1, 2))
          .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
          .withArgs([1, 2]);

        await expect(
          expect(matchers.revertWithCustomErrorWithUint(1, 2))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
            .withArgs([3, 2])
        ).to.be.rejectedWith(AssertionError, "expected 1 to equal 3");
      });

      it("Should fail when used with .not.", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.not.be.revertedWithCustomError(matchers, "SomeCustomError")
            .withArgs(1)
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("should fail if withArgs is called on its own", async function () {
        expect(() =>
          expect(matchers.revertWithCustomErrorWithUint(1))
            // @ts-expect-error
            .withArgs(1)
        ).to.throw(
          Error,
          "withArgs called without a previous .emit or .revertedWithCustomError assertion"
        );
      });

      it("should fail if both emit and revertedWithCustomError are called", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.emit(matchers, "SomeEvent")
            .and.to.be.revertedWithCustomError(matchers, "SomeCustomError")
            .withArgs(1)
        ).to.throw(
          Error,
          "withArgs called with both .emit and .revertedWithCustomError, these assertions cannot be combined"
        );
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expect(
          expect(Promise.reject({})).to.be.revertedWithCustomError(
            matchers,
            "SomeCustomError"
          )
        ).to.be.rejectedWith(AssertionError, "Expected an Error object");
      });

      it("non-string as expectation", async function () {
        const { hash } = await mineSuccessfulTransaction(this.hre);

        expect(() =>
          // @ts-expect-error
          expect(hash).to.be.revertedWith(10)
        ).to.throw(
          TypeError,
          "Expected a string as the expected reason string"
        );
      });

      it("the contract is not specified", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.be // @ts-expect-error
            .revertedWithCustomError("SomeCustomError")
        ).to.throw(
          TypeError,
          "The first argument of .revertedWithCustomError has to be the contract that defines the custom error"
        );
      });

      it("the contract doesn't have a custom error with that name", async function () {
        expect(() =>
          expect(
            matchers.revertWithSomeCustomError()
          ).to.be.revertedWithCustomError(matchers, "SomeCustmError")
        ).to.throw(
          Error,
          "The given contract doesn't have a custom error named 'SomeCustmError'"
        );
      });

      it("errors that are not related to a reverted transaction", async function () {
        // use an address that almost surely doesn't have balance
        const randomPrivateKey =
          "0xc5c587cc6e48e9692aee0bf07474118e6d830c11905f7ec7ff32c09c99eba5f9";
        const signer = new this.hre.ethers.Wallet(
          randomPrivateKey,
          this.hre.ethers.provider
        );

        // this transaction will fail because of lack of funds, not because of a
        // revert
        await expect(
          expect(
            matchers.connect(signer).revertsWithoutReason({
              gasLimit: 1_000_000,
            })
          ).to.not.be.revertedWithCustomError(matchers, "SomeCustomError")
        ).to.be.eventually.rejectedWith(
          ProviderError,
          "sender doesn't have enough funds to send tx"
        );
      });
    });
  }
});
