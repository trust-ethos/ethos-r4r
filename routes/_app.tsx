import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html class="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ethos-timefun-1</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-gray-900 text-white">
        <Component />
      </body>
    </html>
  );
}
