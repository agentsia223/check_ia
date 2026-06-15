import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BambaraVoiceVerify from "./BambaraVoiceVerify";

const baseProps = {
    phase: "idle",
    transcript: "",
    countdown: null,
    isTouch: false,
    onToggle: jest.fn(),
    onStart: jest.fn(),
    onStop: jest.fn(),
    onCancel: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("touch mode shows hold-to-talk and fires start on press, stop on release", () => {
    const onStart = jest.fn();
    const onStop = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch onStart={onStart} onStop={onStop} />);

    const btn = screen.getByRole("button", { name: /maintenez pour parler/i });
    fireEvent.pointerDown(btn);
    expect(onStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
});

test("desktop mode toggles on click", () => {
    const onToggle = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: /enregistrer en bambara/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
});

test("review phase renders the countdown and Annuler", () => {
    const onCancel = jest.fn();
    render(
        <BambaraVoiceVerify
            {...baseProps}
            phase="review"
            transcript="I ni ce"
            countdown={2}
            onCancel={onCancel}
        />
    );

    expect(screen.getByText(/vérification automatique dans 2/i)).toBeInTheDocument();
    expect(screen.getByText(/transcription bambara : i ni ce/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /annuler/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
});

test("touch mode stops on pointer leave and pointer cancel", () => {
    const onStop = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch onStop={onStop} />);

    const btn = screen.getByRole("button", { name: /maintenez pour parler/i });
    fireEvent.pointerLeave(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
    fireEvent.pointerCancel(btn);
    expect(onStop).toHaveBeenCalledTimes(2);
});
