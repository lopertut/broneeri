import { useState, useEffect } from 'react';
import pb from './lib/pocketbase';

export default function App() {
  const currentUser = pb.authStore.record || pb.authStore.model;
  const [user, setUser] = useState(currentUser);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Booking state
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [carModel, setCarModel] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchBookings = async () => {
    if (!pb.authStore.isValid) return;
    try {
      setLoadingBookings(true);
      const records = await pb.collection('bookings').getFullList({
        sort: '-created',
      });
      setMyBookings(records);
    } catch (err) {
      console.error('Broneeringute laadimine ebaõnnestus:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    const activeUser = pb.authStore.record || pb.authStore.model;
    setUser(activeUser);
    if (pb.authStore.isValid) {
      fetchBookings();
    }
    return pb.authStore.onChange(() => {
      const current = pb.authStore.record || pb.authStore.model;
      setUser(current);
      if (current) {
        fetchBookings();
      } else {
        setMyBookings([]);
      }
    });
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegister) {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
        });
      }
      await pb.collection('users').authWithPassword(email, password);
      setIsAuthOpen(false);
      setEmail('');
      setPassword('');
      fetchBookings();
    } catch (err) {
      setAuthError('Viga autoriseerimisel: ' + err.message);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
    setMyBookings([]);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!pb.authStore.isValid) {
      setIsAuthOpen(true);
      return;
    }

    setBookingLoading(true);
    setBookingSuccess('');

    try {
      const activeUser = pb.authStore.record || pb.authStore.model;

      // 1. Create booking record in PocketBase
      const bookingData = {
        user: activeUser?.id,
        service,
        booking_date: `${date} ${time}:00`,
        car_model: carModel,
        car_number: carNumber,
        status: 'pending',
      };

      const record = await pb.collection('bookings').create(bookingData);
      setBookingSuccess('Broneering edukalt salvestatud!');

      // Reset form and refresh
      setService('');
      setDate('');
      setCarModel('');
      setCarNumber('');
      fetchBookings();

      // 2. Direct browser redirect using Stripe Payment Link (No backend API call)
      const stripePaymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
      if (stripePaymentLink) {
        const checkoutUrl = new URL(stripePaymentLink);
        checkoutUrl.searchParams.set('client_reference_id', record.id);
        if (activeUser?.email) {
          checkoutUrl.searchParams.set('prefilled_email', activeUser.email);
        }

        window.location.href = checkoutUrl.toString();
      }
    } catch (err) {
      alert('Viga broneeringu loomisel: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-amber-500/20">
              ⚙️
            </div>
            <span className="font-bold text-xl tracking-wide">
              AutoService<span className="text-amber-500">Pro</span>
            </span>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-300 hidden sm:inline">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Logi välja
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsRegister(false);
                  setIsAuthOpen(true);
                }}
                className="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition shadow-lg shadow-amber-500/20"
              >
                Sisselogimine / Registreerumine
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <span className="text-amber-500 font-bold text-xs uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
          Veebibroneering 24/7
        </span>
        <h1 className="text-4xl md:text-5xl font-black mt-6 mb-4 leading-tight">
          Teie auto hooldus <br />
          <span className="text-amber-500">ilma järjekordadeta</span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">
          Valige teenus, sobiv aeg ja kinnitage broneering vaid mõne klikiga.
        </p>
      </section>

      {/* Booking Form Section */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-slate-800/50 border border-slate-700/60 p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur">
          <h2 className="text-2xl font-bold mb-6 border-b border-slate-700/80 pb-4">
            Aja broneerimine
          </h2>

          {!user ? (
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-8 text-center my-4">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold mb-2">Broneerimiseks logi sisse</h3>
              <p className="text-slate-400 text-sm mb-6">
                Aja broneerimiseks peate olema süsteemi sisse logitud või looma uue konto.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setIsRegister(false);
                    setIsAuthOpen(true);
                  }}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
                >
                  Logi sisse
                </button>
                <button
                  onClick={() => {
                    setIsRegister(true);
                    setIsAuthOpen(true);
                  }}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition"
                >
                  Loo konto
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Teenus</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:border-amber-500 focus:outline-none transition"
                >
                  <option value="">Valige teenus...</option>
                  <option value="diag">Arvutidiagnostika — 25 €</option>
                  <option value="oil">Õli ja filtrite vahetus — 45 €</option>
                  <option value="brakes">Pidurite hooldus — 60 €</option>
                  <option value="full">Täielik tehnohooldus — 120 €</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Kuupäev
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:border-amber-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Aeg</label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:border-amber-500 focus:outline-none transition"
                  >
                    <option value="09:00">09:00</option>
                    <option value="11:00">11:00</option>
                    <option value="14:00">14:00</option>
                    <option value="16:00">16:00</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Auto mark ja mudel
                  </label>
                  <input
                    type="text"
                    placeholder="nt Audi A6"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:border-amber-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Registreerimisnumber
                  </label>
                  <input
                    type="text"
                    placeholder="nt 777 ABC"
                    value={carNumber}
                    onChange={(e) => setCarNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:border-amber-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {bookingSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-xl mb-4">
                  ✓ {bookingSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-4 rounded-xl transition shadow-xl shadow-amber-500/20 mt-4 cursor-pointer"
              >
                {bookingLoading
                  ? 'Suunamine maksmisele...'
                  : 'Broneeri ja mine maksma (Stripe)'}
              </button>
            </form>
          )}

          {/* User bookings */}
          {user && (
            <div className="mt-8 pt-6 border-t border-slate-700/60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-200">Minu broneeringud</h3>
                <button
                  onClick={fetchBookings}
                  type="button"
                  className="text-xs text-amber-500 hover:underline cursor-pointer"
                >
                  Värskenda
                </button>
              </div>

              {loadingBookings ? (
                <p className="text-sm text-slate-400">Laadimine...</p>
              ) : myBookings.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Teil pole veel aktiivseid broneeringuid.
                </p>
              ) : (
                <div className="space-y-3">
                  {myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">
                          {b.service === 'diag' && 'Arvutidiagnostika'}
                          {b.service === 'oil' && 'Õli ja filtrite vahetus'}
                          {b.service === 'brakes' && 'Pidurite hooldus'}
                          {b.service === 'full' && 'Täielik tehnohooldus'}
                          {!['diag', 'oil', 'brakes', 'full'].includes(b.service) &&
                            b.service}
                        </div>
                        <div className="text-xs text-slate-400">
                          {b.car_model} ({b.car_number}) • {b.booking_date}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            b.status === 'confirmed' || b.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {b.status === 'pending' ? 'Ootel / Maksmata' : b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Auth Modal Window */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold mb-6 text-white">
              {isRegister ? 'Konto loomine' : 'Sisselogimine'}
            </h3>

            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">E-post</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Parool</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg transition mt-2"
              >
                {isRegister ? 'Registreeru' : 'Logi sisse'}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-slate-800 pt-4">
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setAuthError('');
                }}
                className="text-xs text-amber-500 hover:underline"
              >
                {isRegister ? 'On juba konto? Logi sisse' : 'Puudub konto? Registreeru'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
