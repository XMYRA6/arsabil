/** @jest-environment jsdom */
import fs from "fs";
import path from "path";

import * as React from "react";
import { render } from "@testing-library/react";

// Modül bayrağı her testte sıfırlansın diye bileşen izole kayıtta yüklenir;
// React örneği ortak kalsın diye react aynı örnekle mocklanır.
function yukle() {
  let SayfaGirisi!: typeof import("../SayfaGirisi").SayfaGirisi;
  jest.isolateModules(() => {
    jest.doMock("react", () => React);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SayfaGirisi = require("../SayfaGirisi").SayfaGirisi;
  });
  return { SayfaGirisi, render };
}

describe("SayfaGirisi", () => {
  it("renders children", () => {
    const { SayfaGirisi, render } = yukle();
    const { getByText } = render(<SayfaGirisi>merhaba</SayfaGirisi>);
    expect(getByText("merhaba")).toBeTruthy();
  });

  it("first mount does not add the animation class", () => {
    const { SayfaGirisi, render } = yukle();
    const { container } = render(<SayfaGirisi>x</SayfaGirisi>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/oynat/);
  });

  it("a later mount (after the first one mounted) adds the animation class", () => {
    const { SayfaGirisi, render } = yukle();
    const ilk = render(<SayfaGirisi>x</SayfaGirisi>);
    ilk.unmount();
    const ikinci = render(<SayfaGirisi>y</SayfaGirisi>);
    expect((ikinci.container.firstChild as HTMLElement).className).toMatch(/oynat/);
  });
});

describe("SayfaGirisi.module.css", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "SayfaGirisi.module.css"), "utf8");
  it("disables animation for reduced motion", () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
  it("uses opacity only", () => {
    expect(css).not.toMatch(/will-change/);
    expect(css).not.toMatch(/transform/);
    expect(css).toMatch(/var\(--dur-enter\)/);
  });
});
