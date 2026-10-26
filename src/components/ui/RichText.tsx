import { Fragment } from "react";

/** Renders assistant text: blank lines → paragraphs, single newlines → <br>, **bold** */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={k} className="font-semibold text-text">
                    {part.slice(2, -2)}
                  </strong>
                ) : (
                  part
                ),
              )}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
