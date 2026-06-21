import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// On Vercel, the database file will be read-only (or reset)
// and it's better to point to the root directory for database.json
const DB_PATH = path.join(process.cwd(), 'database.json');

// Middleware
app.use(cors());
app.use(express.json());

// --- Database Helpers ---

const INITIAL_DATA = {
  users: [
    {
      id: 'user-1',
      name: 'Lojista Demo',
      email: 'demo@pneus.com',
      password: 'password123',
      phone: '5511999999999',
      role: 'admin',
      createdAt: '2026-05-01T00:00:00.000Z'
    }
  ],
  stores: [
    {
      id: 'store-1',
      ownerId: 'user-1',
      slug: 'pneus-express',
      name: 'Pneus Express',
      whatsapp: '5511999999999',
      phone: '1133334444',
      address: 'Av. das Nações Unidas, 12551',
      city: 'São Paulo',
      state: 'SP',
      hours: 'Seg a Sex: 08:00 às 18:00 | Sáb: 08:00 às 13:00',
      logo: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&q=80&w=200',
      banner: '',
      cover: '',
      primaryColor: '#f59e0b',
      secondaryColor: '#121214',
      seoTitle: 'Pneus Express - O melhor em pneus',
      seoDescription: 'As melhores marcas de pneus com o melhor preço da região e instalação grátis.',
      plan: 'pro',
      description: 'Seu Auto Center completo. As melhores marcas de pneus com o melhor preço da região e instalação grátis.',
      createdAt: '2026-05-01T00:00:00.000Z'
    }
  ],
  tires: [
    {
      id: 'tire-1',
      storeId: 'store-1',
      name: 'Primacy 4',
      brand: 'Michelin',
      aro: '16',
      medida: '195/55 R16',
      price: 689.90,
      stock: true,
      image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=400',
      description: 'O pneu Michelin Primacy 4 oferece uma excelente frenagem em piso molhado do primeiro ao último quilômetro, proporcionando máxima segurança e durabilidade.',
      installments: '10x de R$ 68,99 sem juros',
      active: true,
    },
    {
      id: 'tire-2',
      storeId: 'store-1',
      name: 'Cinturato P7',
      brand: 'Pirelli',
      aro: '16',
      medida: '205/55 R16',
      price: 549.90,
      stock: true,
      image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=400',
      description: 'Pneu Pirelli Cinturato P7 é a escolha ideal para quem busca alta performance para carros de média e alta potência, combinando segurança, controle e respeito ao meio ambiente.',
      installments: '6x de R$ 91,65 sem juros',
      active: true,
    }
  ],
  compatibility: [
    { id: 'c-1', storeId: 'store-1', tireId: 'tire-1', brand: 'Chevrolet', model: 'Onix', year: '2020', version: '1.0 Turbo Premier' }
  ],
  leads: []
};

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    return INITIAL_DATA;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);
    // Ensure essential collections exist
    if (!db.users) db.users = INITIAL_DATA.users;
    if (!db.stores) db.stores = INITIAL_DATA.stores;
    return db;
  } catch (e) {
    return INITIAL_DATA;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[DB] Erro ao escrever no arquivo (Normal em Vercel)');
  }
}

function sanitizeUser(user) {
  if (!user) return undefined;

  const { password, ownerPassword, ...safeUser } = user;
  return safeUser;
}

function sanitizeStore(store) {
  if (!store) return undefined;

  const { password, ownerPassword, ...safeStore } = store;
  return safeStore;
}

function serializeStoreWithUser(store, user) {
  return {
    ...sanitizeStore(store),
    user: sanitizeUser(user)
  };
}

// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || req.body.ownerEmail || "").trim().toLowerCase();
  const password = String(req.body.password || req.body.ownerPassword || "").trim();

  console.log('[AUTH] Tentativa de login recebida');

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const db = readDB();
  
  // Search in users collection
  const user = db.users?.find(u => 
    String(u.email || "").trim().toLowerCase() === email
  );
  
  if (user) {
    console.log('[AUTH] Usuario encontrado para login');
    const isMatch = user.password.startsWith('$2a$') 
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (isMatch) {
      const store = db.stores.find(s => s.ownerId === user.id);
      if (store) {
        console.log('[AUTH] Login concluido com sucesso');
        return res.json(serializeStoreWithUser(store, user));
      }
    }
  }

  // Fallback old structure
  const storeFallback = db.stores.find(s => 
    String(s.ownerEmail || "").trim().toLowerCase() === email
  );
  
  if (storeFallback) {
    const isMatch = (storeFallback.ownerPassword || "").startsWith('$2a$')
      ? await bcrypt.compare(password, storeFallback.ownerPassword)
      : password === storeFallback.ownerPassword;

    if (isMatch) {
      return res.json(sanitizeStore(storeFallback));
    }
  }

  return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
});

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.ownerEmail || req.body.email || "").trim().toLowerCase();
  const password = String(req.body.ownerPassword || req.body.password || "").trim();
  const name = String(req.body.name || req.body.ownerName || "").trim();
  const storeName = String(req.body.storeName || req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();

  console.log('[AUTH] Registro recebido');

  if (!email || !password || !name || !storeName) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  const db = readDB();
  if (!db.users) db.users = [];

  const emailExists = db.users.some(u => 
    String(u.email || "").trim().toLowerCase() === email
  ) || db.stores.some(s => 
    String(s.ownerEmail || "").trim().toLowerCase() === email
  );

  if (emailExists) {
    return res.status(409).json({ error: 'E-mail já cadastrado.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = `user-${Date.now()}`;
  const newUser = {
    id: userId,
    name,
    email,
    password: hashedPassword,
    phone,
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  const newStore = {
    id: `store-${Date.now()}`,
    ownerId: userId,
    slug: storeName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
    name: storeName,
    whatsapp: phone,
    phone: '',
    address: '',
    city: '',
    state: '',
    hours: 'Seg a Sex: 08:00 às 18:00',
    logo: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&q=80&w=200',
    banner: '',
    cover: '',
    primaryColor: '#f59e0b',
    secondaryColor: '#121214',
    seoTitle: '',
    seoDescription: '',
    plan: 'free',
    description: '',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.stores.push(newStore);
  writeDB(db);
  
  return res.status(201).json(serializeStoreWithUser(newStore, newUser));
});

// --- STORE ROUTES ---

app.get('/api/stores/:id', (req, res) => {
  const db = readDB();
  const store = db.stores.find(s => s.id === req.params.id);
  if (store) {
    const user = db.users?.find(u => u.id === store.ownerId);
    return res.json(serializeStoreWithUser(store, user));
  }
  return res.status(404).json({ error: 'Loja não encontrada' });
});

app.get('/api/stores/slug/:slug', (req, res) => {
  const db = readDB();
  const store = db.stores.find(s => s.slug === req.params.slug);
  if (store) {
    const user = db.users?.find(u => u.id === store.ownerId);
    return res.json(serializeStoreWithUser(store, user));
  }
  return res.status(404).json({ error: 'Loja não encontrada' });
});

app.get('/api/stores', (req, res) => {
  const db = readDB();
  return res.json(db.stores.map(sanitizeStore));
});

app.put('/api/stores/:id', (req, res) => {
  const db = readDB();
  const index = db.stores.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Loja não encontrada' });

  db.stores[index] = { ...db.stores[index], ...req.body };
  writeDB(db);
  return res.json(sanitizeStore(db.stores[index]));
});

// --- TIRE ROUTES ---

app.get('/api/tires', (req, res) => {
  const db = readDB();
  const { storeId } = req.query;
  if (storeId) {
    return res.json(db.tires.filter(t => t.storeId === storeId));
  }
  return res.json(db.tires);
});

app.get('/api/tires/:id', (req, res) => {
  const db = readDB();
  const tire = db.tires.find(t => t.id === req.params.id);
  if (tire) return res.json(tire);
  return res.status(404).json({ error: 'Pneu não encontrado' });
});

app.post('/api/tires', (req, res) => {
  const db = readDB();
  const newTire = {
    id: `tire-${Date.now()}`,
    active: true,
    stock: true,
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=400',
    ...req.body
  };
  db.tires.push(newTire);
  writeDB(db);
  return res.status(201).json(newTire);
});

app.put('/api/tires/:id', (req, res) => {
  const db = readDB();
  const index = db.tires.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Pneu não encontrado' });

  db.tires[index] = { ...db.tires[index], ...req.body };
  writeDB(db);
  return res.json(db.tires[index]);
});

app.delete('/api/tires/:id', (req, res) => {
  const db = readDB();
  db.tires = db.tires.filter(t => t.id !== req.params.id);
  db.compatibility = db.compatibility.filter(c => c.tireId !== req.params.id);
  writeDB(db);
  return res.json({ success: true });
});

// --- COMPATIBILITY ROUTES ---

app.get('/api/compatibility', (req, res) => {
  const db = readDB();
  const { storeId, tireId } = req.query;
  let result = db.compatibility;
  if (storeId) result = result.filter(c => c.storeId === storeId);
  if (tireId) result = result.filter(c => c.tireId === tireId);
  return res.json(result);
});

app.post('/api/compatibility', (req, res) => {
  const db = readDB();
  const newComp = {
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    ...req.body
  };
  db.compatibility.push(newComp);
  writeDB(db);
  return res.status(201).json(newComp);
});

app.delete('/api/compatibility/:id', (req, res) => {
  const db = readDB();
  db.compatibility = db.compatibility.filter(c => c.id !== req.params.id);
  writeDB(db);
  return res.json({ success: true });
});

// --- VEHICLE SEARCH ---

app.get('/api/tires/search/vehicle', (req, res) => {
  const { storeId, brand, model, year, version } = req.query;
  const db = readDB();

  const comps = db.compatibility.filter(c => {
    const matchStore = c.storeId === storeId;
    const matchBrand = c.brand?.toLowerCase() === (brand || '').toLowerCase();
    const matchModel = c.model?.toLowerCase() === (model || '').toLowerCase();
    const matchYear = c.year === year;
    const matchVersion = !version || c.version?.toLowerCase() === version.toLowerCase();
    return matchStore && matchBrand && matchModel && matchYear && matchVersion;
  });

  const tireIds = [...new Set(comps.map(c => c.tireId))];
  const tires = db.tires.filter(t => tireIds.includes(t.id) && t.active);
  return res.json(tires);
});

// --- LEADS ROUTES ---

app.get('/api/leads', (req, res) => {
  const db = readDB();
  const { storeId } = req.query;
  let result = db.leads || [];
  if (storeId) {
    result = result
      .filter(l => l.storeId === storeId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  return res.json(result);
});

app.post('/api/leads', (req, res) => {
  const db = readDB();
  const { storeId, tireId, vehicleInfo } = req.body;
  const tire = db.tires.find(t => t.id === tireId);
  const newLead = {
    id: `lead-${Date.now()}`,
    storeId,
    tireId,
    tireName: tire ? `${tire.brand} ${tire.name} ${tire.medida}` : 'Pneu Desconhecido',
    vehicleInfo: vehicleInfo || '',
    timestamp: new Date().toISOString()
  };
  if (!db.leads) db.leads = [];
  db.leads.push(newLead);
  writeDB(db);
  return res.status(201).json(newLead);
});

app.delete('/api/leads/:id', (req, res) => {
  const db = readDB();
  db.leads = (db.leads || []).filter(l => l.id !== req.params.id);
  writeDB(db);
  return res.json({ success: true });
});

export default app;
