import { useEffect, useState } from "react";
import Search from "./components/Search.jsx";
import Spinner from "./components/Spinner.jsx";
import MovieCard from "./components/MovieCard.jsx";
import { useDebounce } from "react-use";

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const FLASK_API_BASE = "http://localhost:5000";

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Debounce search input
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  // Fetch movies from TMDB
  const fetchMovies = async (query = "") => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(
            query
          )}&api_key=${API_KEY}&language=en-US&page=1&include_adult=false`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&language=en-US&page=1`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch movies");

      const data = await res.json();
      setMovieList(data.results || []);

      // Update Flask search count and refresh trending
      if (query && data.results.length > 0) {
        try {
          await fetch(`${FLASK_API_BASE}/update_search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              searchTerm: query,
              movie: {
                id: data.results[0].id,
                poster_url: data.results[0].poster_path,
              },
            }),
          });

          // Reload trending movies immediately
          loadTrendingMovies();
        } catch (flaskError) {
          console.error("Flask update_search failed:", flaskError);
        }
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
      setErrorMessage("Error fetching movies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load trending movies from Flask
  const loadTrendingMovies = async () => {
    try {
      const res = await fetch(`${FLASK_API_BASE}/trending`);
      if (!res.ok) throw new Error("Failed to fetch trending movies");

      const data = await res.json();
      const moviesWithPoster = data.map((movie) => ({
        ...movie,
        poster_url: movie.poster_url
          ? `https://image.tmdb.org/t/p/w200${movie.poster_url}`
          : null,
      }));
      setTrendingMovies(moviesWithPoster);
    } catch (error) {
      console.error("Error fetching trending movies:", error);
      setTrendingMovies([]);
    }
  };

  // Effects
  useEffect(() => {
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <main>
      <div className="pattern" />

      <div className="wrapper">
        <header>
          <img src="./hero.png" alt="Hero Banner" />
          <h1>
            Find <span className="text-gradient">Movies</span> You'll Enjoy
          </h1>

          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li
                  key={movie.id}
                  className="min-w-[230px] flex flex-row items-start gap-4"
                >
                  <p className="fancy-text mt-1">{index + 1}</p>
                  {movie.poster_url && (
                    <img
                      src={movie.poster_url}
                      alt={`Trending ${index + 1}`}
                      className="w-[127px] h-[163px] rounded-lg object-cover"
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="all-movies">
          <h2>All Movies</h2>
          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : movieList.length === 0 ? (
            <p>No movies found.</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
