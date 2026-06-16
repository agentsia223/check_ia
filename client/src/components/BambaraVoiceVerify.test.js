import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BambaraVoiceVerify from "./BambaraVoiceVerify";

const baseProps = {
    phase: "idle",
    transcript: "",
    isTouch: false,
    loading: false,
    onToggle: jest.fn(),
    onStart: jest.fn(),
    onStop: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("touch mode shows hold-to-talk and fires start on press, stop on release", () => {
    const onStart = jest.fn();
    const onStop = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch onStart={onStart} onStop={onStop} />);

    expect(screen.getByText(/maintenez pour parler/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /enregistrer en bambara/i });
    fireEvent.pointerDown(btn);
    expect(onStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
});

test("touch mode stops on pointer leave and pointer cancel", () => {
    const onStop = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch onStop={onStop} />);

    const btn = screen.getByRole("button", { name: /enregistrer en bambara/i });
    fireEvent.pointerLeave(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
    fireEvent.pointerCancel(btn);
    expect(onStop).toHaveBeenCalledTimes(2);
});

test("desktop mode toggles on click and shows the ready state", () => {
    const onToggle = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch={false} onToggle={onToggle} />);

    expect(screen.getByText(/appuyez pour parler/i)).toBeInTheDocument();
    expect(screen.getByText(/prêt à écouter/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer en bambara/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
});

test("recording state relabels the mic and shows the listening status", () => {
    render(<BambaraVoiceVerify {...baseProps} phase="recording" transcript="I ni ce" />);

    expect(screen.getByRole("button", { name: /arrêter l'enregistrement/i })).toBeInTheDocument();
    expect(screen.getByText(/écoute en cours/i)).toBeInTheDocument();
    expect(screen.getByText(/transcription bambara : i ni ce/i)).toBeInTheDocument();
});

test("transcribing disables the mic and shows the transcription status", () => {
    render(<BambaraVoiceVerify {...baseProps} phase="transcribing" />);

    expect(screen.getByRole("button", { name: /enregistrer en bambara/i })).toBeDisabled();
    expect(screen.getByText(/^transcription…$/i)).toBeInTheDocument();
});

test("an active verification (loading) disables the mic", () => {
    render(<BambaraVoiceVerify {...baseProps} loading />);
    expect(screen.getByRole("button", { name: /enregistrer en bambara/i })).toBeDisabled();
});
