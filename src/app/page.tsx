import Image from "next/image";
import SearchForm from "@/components/SearchForm";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center mb-10">
        <div className="flex flex-col items-center gap-4 mb-4">
          <Image
            src="https://locafy.com/_astro/LocafyDark.DAFw3kIA.png"
            alt="Locafy"
            width={180}
            height={48}
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-geist-sans)]">
            Keyword Tool
          </h1>
        </div>
        <p className="text-lg text-gray-600 mb-2">
          Find the best keywords for your local SEO campaigns
        </p>
        <p className="text-sm text-gray-400">
          Enter a business type and location to discover keyword opportunities
          with search volume, difficulty, and trend data.
        </p>
      </div>

      <SearchForm />

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl w-full">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Search Volume</h3>
          <p className="text-sm text-gray-500">
            See how many people search for each keyword monthly
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Keyword Difficulty
          </h3>
          <p className="text-sm text-gray-500">
            Know how hard it is to rank for each keyword
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Trend Data</h3>
          <p className="text-sm text-gray-500">
            Track keyword popularity over time
          </p>
        </div>
      </div>
    </div>
  );
}
