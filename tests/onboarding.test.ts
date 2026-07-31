import { describe, expect, it } from "vitest";
import {
  canAdvanceOnboardingStep,
  getOnboardingStep,
  ONBOARDING_STEPS,
  type OnboardingAnswers,
} from "../src/features/onboarding/onboarding-steps";

const emptyAnswers = (): OnboardingAnswers => ({
  name: "",
  intention: null,
  offlineAcknowledged: false,
});

describe("Onboarding steps", () => {
  it("walks through name, intention, and offline acknowledgment", () => {
    expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual([
      "name",
      "intention",
      "offline",
    ]);
    expect(getOnboardingStep(0).id).toBe("name");
    expect(getOnboardingStep(2).id).toBe("offline");
  });

  it("requires a profile name before leaving the first step", () => {
    expect(
      canAdvanceOnboardingStep({
        stepIndex: 0,
        answers: emptyAnswers(),
      })
    ).toBe(false);

    expect(
      canAdvanceOnboardingStep({
        stepIndex: 0,
        answers: { ...emptyAnswers(), name: "Ada" },
      })
    ).toBe(true);
  });

  it("requires an intention before leaving the second step", () => {
    expect(
      canAdvanceOnboardingStep({
        stepIndex: 1,
        answers: { ...emptyAnswers(), name: "Ada" },
      })
    ).toBe(false);

    expect(
      canAdvanceOnboardingStep({
        stepIndex: 1,
        answers: {
          ...emptyAnswers(),
          name: "Ada",
          intention: "both",
        },
      })
    ).toBe(true);
  });

  it("requires offline acknowledgment before finishing", () => {
    expect(
      canAdvanceOnboardingStep({
        stepIndex: 2,
        answers: {
          name: "Ada",
          intention: "journal",
          offlineAcknowledged: false,
        },
      })
    ).toBe(false);

    expect(
      canAdvanceOnboardingStep({
        stepIndex: 2,
        answers: {
          name: "Ada",
          intention: "journal",
          offlineAcknowledged: true,
        },
      })
    ).toBe(true);
  });
});
