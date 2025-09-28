/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "../src/App";

describe("App", () => {
  it("renders without crashing", async () => {
    const { container } = render(<App />);

    // Check for the presence of key elements
    const textBox = screen.getByPlaceholderText("Ask anything...");
    const [addImageButton] = container.querySelectorAll("#dropzone button") as NodeListOf<HTMLButtonElement>;
    expect(textBox).toBeInTheDocument();
    expect(addImageButton).toBeInTheDocument();

    // Mock the createElement to handle file input creation
    let input: HTMLInputElement | null = null;
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementationOnce((tagName: string) => {
      if (tagName === "input") {
        input = document.createElement("input");
        input.type = "file";
        return input;
      }
      return document.createElement(tagName);
    });

    // Simulate clicking the add image button
    addImageButton.click();
    expect(createElementSpy).toBeCalled();
    expect(input).not.toBeNull();

    /* Select image to upload */
    const file = new File(["dummy content"], "test-image.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [file] });
    expect(container.querySelectorAll("#dropzone img")).toHaveLength(0);
    act(() => input!.dispatchEvent(new Event("change", { bubbles: true })));

    // Expect the image to be rendered in the document
    const images = container.querySelectorAll("#dropzone img");
    expect(images).toHaveLength(1);
    const dropzoneImage = images[0] as HTMLImageElement;
    expect(dropzoneImage.src).toContain("http://localhost:3000/mock-object-url");

    // Click the X to remove the image
    const removeButton = dropzoneImage.nextSibling as HTMLButtonElement;
    act(() => removeButton.click());
    expect(container.querySelectorAll("#dropzone img")).toHaveLength(0);
  });

  it("Ask a question in the textbox", async () => {
    // const { container } =
    render(<App />);

    const textbox = screen.getByPlaceholderText("Ask anything...");
    expect(textbox).toBeInTheDocument();

    // Simulate user typing a question
    act(() => {
      textbox.textContent = "What is in the image?\n";
      textbox.dispatchEvent(new Event("keydown", { bubbles: true }));
    });

    const chatMessages = await screen.findAllByText("What is in the image?");

    expect(chatMessages).toHaveLength(1);
  });
});
