import { describe, expect, it } from "vitest";
import { createSecretBox } from "./secretBox";

const KEY = "uma-chave-secreta-com-mais-de-32-caracteres";

describe("createSecretBox", () => {
  it("opens what it sealed, with a new random value each time", () => {
    const box = createSecretBox(KEY);
    const first = box.seal('{"access_token":"abc"}');
    expect(box.open(first)).toBe('{"access_token":"abc"}');
    expect(box.seal('{"access_token":"abc"}')).not.toBe(first);
    expect(first).not.toContain("abc");
  });

  it("refuses altered values and values sealed with another key", () => {
    const sealed = createSecretBox(KEY).seal("segredo");
    const [version, iv, tag, ciphertext] = sealed.split(".");
    const flipped = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
    expect(() => createSecretBox(KEY).open([version, iv, tag, flipped].join("."))).toThrow(/altered/);
    expect(() => createSecretBox(`${KEY}-outra`).open(sealed)).toThrow(/altered/);
    expect(() => createSecretBox(KEY).open("texto-puro")).toThrow(/format/);
  });
});
