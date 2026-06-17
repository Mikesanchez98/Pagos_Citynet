import { Link } from 'react-router-dom';
import logoCitynet from '../assets/logo-citynet-antiguo.png';

const WHATSAPP_URL = 'https://wa.me/523121989395';

const services = [
  {
    number: '01',
    title: 'Internet de Alta Velocidad',
    description:
      'Ofrecemos un servicio de internet rápido y estable para satisfacer las necesidades de tu hogar o negocio.',
  },
  {
    number: '02',
    title: 'Planes Accesibles',
    description:
      'Planes de internet adaptados a tu presupuesto, sin afectar la calidad del servicio.',
  },
  {
    number: '03',
    title: 'Soporte al Cliente',
    description:
      'Un servicio al cliente excepcional, disponible siempre que lo necesites.',
  },
];

const stats = [
  { value: '98%', label: 'Satisfacción del Cliente' },
  { value: '15+', label: 'Miembros del Equipo' },
  { value: '10+', label: 'Años de Experiencia' },
];

const testimonials = [
  {
    quote:
      'Recién me mudé y contratar Citynet fue una de las mejores decisiones. Ninguna otra compañía podía ofrecerme cobertura en la zona, pero con Citynet todo fue rápido. La instalación se realizó al día siguiente y la conexión ha sido estable, sin cortes ni fallas.',
    author: 'Sandra Haro',
  },
  {
    quote:
      'Estoy muy satisfecha con CITYNET. Su atención al cliente es excepcional y siempre están dispuestos a ayudarme.',
    author: 'Andrea López',
  },
  {
    quote:
      'He probado varias compañías, pero ninguna se compara con la calidad de servicio de CITYNET. ¡Altamente recomendados!',
    author: 'Carlos Pérez',
  },
  {
    quote:
      'Nada como CITYNET. La conexión es fiable y el precio, accesible. No podría pedir más.',
    author: 'Mónica Torres',
  },
];

const valueProps = [
  {
    number: '01',
    title: 'Conexiones estables',
    description:
      'Utilizamos tecnología de vanguardia para ofrecer conexiones rápidas y sin interrupciones a nuestros usuarios.',
  },
  {
    number: '02',
    title: 'Precios accesibles',
    description:
      'Ofrecemos planes competitivos que se ajustan a tu presupuesto sin sacrificar la calidad del servicio.',
  },
  {
    number: '03',
    title: 'Atención personal',
    description:
      'Nuestro equipo de servicio al cliente está siempre disponible para resolver cualquier inconveniente que puedas tener.',
  },
];

function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#inicio" className="flex items-center gap-3">
          <img src={logoCitynet} alt="Citynet" className="h-10 w-auto object-contain" />
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#nosotros" className="hover:text-primary transition-colors">
            Nosotros
          </a>
          <a href="#servicios" className="hover:text-primary transition-colors">
            Servicios
          </a>
          <a href="#testimonios" className="hover:text-primary transition-colors">
            Testimonios
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
          >
            Portal de clientes
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            ¡Únete ahora!
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section id="inicio" className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/80" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white_0%,_transparent_50%)]" />

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-4">
            Conexiones de calidad
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Internet de alta velocidad en Colima
          </h1>
          <p className="text-lg text-slate-200 mb-8 max-w-xl leading-relaxed">
            Donde otros proveedores no llegan. Instalación en 24 horas, sin contratos forzosos.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-8 py-4 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors"
            >
              ¡Únete ahora!
            </a>
            <a
              href="#nosotros"
              className="inline-flex px-8 py-4 rounded-full border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Conoce CITYNET
            </a>
          </div>
        </div>

        <div className="hidden lg:flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 max-w-md">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white/10 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-200 mt-2">{stat.label}</p>
                </div>
              ))}
              <div className="col-span-2 bg-white/10 rounded-2xl p-5 text-center">
                <p className="text-sm text-slate-200">
                  Cobertura en comunidades donde otros no llegan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="nosotros" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Comprometidos con la conectividad de calidad
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            CITYNET es una empresa líder en telecomunicaciones en Colima, México
          </h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Con más de 10 años de experiencia, CITYNET se especializa en ofrecer servicios de
            internet de alta calidad a comunidades desatendidas. Utilizamos tecnología avanzada y
            robusta para garantizar una conexión estable y rápida.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Nos diferenciamos por nuestros precios accesibles y un servicio al cliente
            excepcional, lo que nos ha valido una sólida reputación y el reconocimiento de
            nuestros usuarios.
          </p>
        </div>

        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Nuestra historia
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Más de una década de servicio</h3>
          <p className="text-slate-600 leading-relaxed">
            CITYNET fue fundada hace más de 10 años en Colima, con la visión de proporcionar
            internet de alta calidad a comunidades que carecen de servicios adecuados. Desde
            nuestros inicios, hemos crecido y evolucionado, incorporando tecnologías de punta y
            adaptando nuestras ofertas a las necesidades cambiantes de nuestros clientes.
          </p>
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="servicios" className="py-24 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Nuestros servicios
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Soluciones de telecomunicaciones a tu alcance
          </h2>
          <p className="text-slate-600">
            Conoce nuestros planes y descubre cómo podemos ayudarte a estar conectado.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service) => (
            <article
              key={service.number}
              className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-4xl font-bold text-primary/20">{service.number}</span>
              <h3 className="text-xl font-bold text-slate-900 mt-4 mb-3">{service.title}</h3>
              <p className="text-slate-600 leading-relaxed">{service.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-16 px-6 bg-primary">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center text-white">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</p>
            <p className="text-blue-100 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonios" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Opiniones de clientes
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Lo que dicen nuestros clientes satisfechos
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <blockquote
              key={testimonial.author}
              className="bg-slate-50 rounded-3xl p-8 border border-slate-100"
            >
              <p className="text-slate-600 leading-relaxed mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
              <footer className="font-bold text-slate-900">{testimonial.author}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValuePropsSection() {
  return (
    <section className="py-24 px-6 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300 mb-3">
            ¿Por qué elegirnos?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">Nuestra propuesta de valor única</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {valueProps.map((item) => (
            <article key={item.number} className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <span className="text-3xl font-bold text-blue-400">{item.number}</span>
              <h3 className="text-xl font-bold mt-4 mb-3">{item.title}</h3>
              <p className="text-slate-300 leading-relaxed">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 px-6 bg-gradient-to-r from-primary to-blue-700">
      <div className="max-w-4xl mx-auto text-center text-white">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-100 mb-3">
          Actúa ahora
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Conéctate con CITYNET y experimenta la diferencia
        </h2>
        <p className="text-lg text-blue-100 mb-8">
          No esperes más, mejora tu conexión a internet hoy mismo con nuestros planes accesibles.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-8 py-4 rounded-full bg-white text-primary font-bold hover:bg-slate-100 transition-colors"
          >
            ¡Únete ahora!
          </a>
          <Link
            to="/login"
            className="inline-flex px-8 py-4 rounded-full border border-white/40 font-semibold hover:bg-white/10 transition-colors"
          >
            Ya soy cliente
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={logoCitynet} alt="Citynet" className="h-10 w-auto object-contain brightness-0 invert" />
          <p className="text-sm">Internet de alta velocidad en Colima, México</p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            WhatsApp: +52 312 198 9395
          </a>
          <Link to="/login" className="hover:text-white transition-colors">
            Portal de clientes
          </Link>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatea con nosotros por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-full shadow-lg transition-colors"
    >
      <span className="text-lg">💬</span>
      <span className="text-sm font-semibold hidden sm:inline">¿Necesitas ayuda?</span>
    </a>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <StatsSection />
        <TestimonialsSection />
        <ValuePropsSection />
        <CtaSection />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
