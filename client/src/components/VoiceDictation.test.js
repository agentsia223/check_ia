import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VoiceDictation from "./VoiceDictation";

const baseProps = {
    phase: "idle",
    transcript: "",
    isTouch: false,
    loading: false,
    language: "bm",
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
    render(<VoiceDictation {...baseProps} isTouch onStart={onStart} onStop={onStop} />);

    expect(screen.getByText(/maintenez pour parler/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /enregistrer en bambara/i });
    fireEvent.pointerDown(btn);
    expect(onStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
});

test("touch mode stops on pointer leave and pointer cancel", () => {
    const onStop = jest.fn();
    render(<VoiceDictation {...baseProps} isTouch onStop={onStop} />);

    const btn = screen.getByRole("button", { name: /enregistrer en bambara/i });
    fireEvent.pointerLeave(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
    fireEvent.pointerCancel(btn);
    expect(onStop).toHaveBeenCalledTimes(2);
});

test("desktop mode toggles on click and shows the ready state", () => {
    const onToggle = jest.fn();
    render(<VoiceDictation {...baseProps} isTouch={false} onToggle={onToggle} />);

    expect(screen.getByText(/dicter en bambara/i)).toBeInTheDocument();
    expect(screen.getByText(/appuyez pour parler/i)).toBeInTheDocument();
    expect(screen.getByText(/prêt à écouter/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer en bambara/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
});

test("French language relabels the card and mic, and hides the Bambara transcript", () => {
    render(<VoiceDictation {...baseProps} language="fr" transcript="ignored" />);

    expect(screen.getByText(/dicter en français/i)).toBeInTheDocument();
    expect(
        screen.getByRole("button", { name: /enregistrer en français/i })
    ).toBeInTheDocument();
    // The raw transcript line is Bambara-only (French transcript === the claim itself).
    expect(screen.queryByText(/transcription bambara/i)).not.toBeInTheDocument();
});

test("recording state relabels the mic and shows the listening status", () => {
    render(<VoiceDictation {...baseProps} phase="recording" transcript="I ni ce" />);

    expect(screen.getByRole("button", { name: /arrêter l'enregistrement/i })).toBeInTheDocument();
    expect(screen.getByText(/écoute en cours/i)).toBeInTheDocument();
    expect(screen.getByText(/transcription bambara : i ni ce/i)).toBeInTheDocument();
});

test("transcribing disables the mic and shows the transcription status", () => {
    render(<VoiceDictation {...baseProps} phase="transcribing" />);

    expect(screen.getByRole("button", { name: /enregistrer en bambara/i })).toBeDisabled();
    expect(screen.getByText(/^transcription…$/i)).toBeInTheDocument();
});

test("an active verification (loading) disables the mic", () => {
    render(<VoiceDictation {...baseProps} loading />);
    expect(screen.getByRole("button", { name: /enregistrer en bambara/i })).toBeDisabled();
});
