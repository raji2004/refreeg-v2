import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Step3 from "@/app/onboarding/step3";

describe("Web Onboarding Step3 Component (Figma W1·03b)", () => {
  const defaultProps = {
    user: { id: "user-1", name: "" },
    onboardingData: { accountType: "individual", profile: {} },
    updateOnboardingData: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Individual giver mode by default and shows clay validation errors for invalid inputs", () => {
    const onNext = jest.fn();
    render(<Step3 {...defaultProps} onNext={onNext} />);

    expect(screen.getByText("Tell us about you")).toBeInTheDocument();
    expect(screen.getByTestId("account-type-individual")).toBeInTheDocument();
    expect(screen.getByTestId("account-type-organization")).toBeInTheDocument();

    // Enter single-word name and under-18 DOB
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Amina" },
    });
    fireEvent.change(screen.getByLabelText("Date of birth"), {
      target: { value: "14/08/2012" },
    });

    const continueButtons = screen.getAllByRole("button", { name: /continue/i });
    fireEvent.click(continueButtons[0]);

    expect(
      screen.getByText("Enter your first and last name, as on your ID."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You need to be 18 or over to use RefreeG."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Fix the two fields marked in clay to continue").length,
    ).toBeGreaterThan(0);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("submits valid Individual giver profile data", () => {
    const onNext = jest.fn();
    render(<Step3 {...defaultProps} onNext={onNext} />);

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Amina Bello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Female" }));
    fireEvent.change(screen.getByLabelText("Date of birth"), {
      target: { value: "14/08/1996" },
    });
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "Lagos" },
    });
    fireEvent.change(screen.getByLabelText("City or area"), {
      target: { value: "Lekki" },
    });

    const continueButtons = screen.getAllByRole("button", { name: /continue/i });
    fireEvent.click(continueButtons[0]);

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        accountType: "individual",
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
        gender: "female",
        dateOfBirth: "14/08/1996",
        state: "Lagos",
        city: "Lekki",
        location: "Lekki, Lagos",
      }),
    );
  });

  it("switches to Organisation mode and submits organisation fields", () => {
    const onNext = jest.fn();
    const updateOnboardingData = jest.fn();
    render(
      <Step3
        {...defaultProps}
        onNext={onNext}
        updateOnboardingData={updateOnboardingData}
      />,
    );

    // Switch to Organisation radio card
    fireEvent.click(screen.getByTestId("account-type-organization"));
    expect(updateOnboardingData).toHaveBeenCalledWith(
      "accountType",
      "organization",
    );

    fireEvent.change(screen.getByLabelText("Organisation name"), {
      target: { value: "Bello Community Foundation" },
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "Registered NGO" },
    });
    fireEvent.change(screen.getByLabelText("Your full name"), {
      target: { value: "Amina Bello" },
    });
    fireEvent.change(screen.getByLabelText("Your role"), {
      target: { value: "Executive Director" },
    });
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "Lagos" },
    });
    fireEvent.change(screen.getByLabelText("City or area"), {
      target: { value: "Yaba" },
    });

    const continueButtons = screen.getAllByRole("button", { name: /continue/i });
    fireEvent.click(continueButtons[0]);

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        accountType: "organization",
        organizationName: "Bello Community Foundation",
        organizationType: "Registered NGO",
        organizationRole: "Executive Director",
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
        state: "Lagos",
        city: "Yaba",
        location: "Yaba, Lagos",
      }),
    );
  });
});
