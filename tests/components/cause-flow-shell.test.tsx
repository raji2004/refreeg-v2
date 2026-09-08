import { fireEvent, render, screen } from "@testing-library/react";
import { FormStepper } from "@/components/ui/premium/form-stepper";
import { PremiumFormContainer } from "@/components/ui/premium/premium-form-container";

describe("RefreeG cause flow shell", () => {
  it("renders the campaign workspace and vertical setup progress", () => {
    const onStepSelect = jest.fn();
    render(
      <PremiumFormContainer
        title="Create a cause"
        description="Set up your campaign"
        variant="refreeg"
      >
        <FormStepper
          steps={["Basic Info", "Story", "Timeline", "Media", "Review"]}
          currentStep={2}
          variant="refreeg"
          onStepSelect={onStepSelect}
        />
      </PremiumFormContainer>,
    );

    expect(
      screen.getByRole("heading", { name: "Create a cause" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Campaign builder")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getAllByText("40%").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByText("Story")
        .find((element) => element.closest('[aria-current="step"]')),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Go back to Basic Info" }),
    );
    expect(onStepSelect).toHaveBeenCalledWith(1);
    expect(screen.getByText("Timeline").closest("button")).toBeDisabled();
  });
});
