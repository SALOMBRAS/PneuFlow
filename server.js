import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());

// --- Database Helpers ---

const INITIAL_DATA = {
  users: [
    {
      id: 'user-1',
      name: 'João da Silva',
      email: 'demo@pneus.com',
      password: 'password123',
      phone: '5511999999999',
      role: 'admin',
      createdAt: new Date('2026-05-01').toISOString(),
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
      createdAt: new Date('2026-05-01').toISOString(),
    }
  ],
  tires: [
    // ... (rest of tires remains the same)
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
    },
    {
      id: 'tire-3',
      storeId: 'store-1',
      name: 'Eagle F1 Asymmetric 5',
      brand: 'Goodyear',
      aro: '17',
      medida: '225/45 R17',
      price: 729.90,
      stock: true,
      image: 'https://images.unsplash.com/photo-1611245353597-90f77d33d997?auto=format&fit=crop&q=80&w=400',
      description: 'O Eagle F1 Asymmetric 5 é o pneu esportivo premium definitivo. Oferece aderência excepcional, frenagem superior no molhado e excelente dirigibilidade esportiva no seco.',
      installments: '12x de R$ 60,82 sem juros',
      active: true,
    },
    {
      id: 'tire-4',
      storeId: 'store-1',
      name: 'Turanza T005',
      brand: 'Bridgestone',
      aro: '15',
      medida: '185/65 R15',
      price: 459.90,
      stock: true,
      image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&q=80&w=400',
      description: 'O Bridgestone Turanza T005 foi desenvolvido para proporcionar controle e frenagem superior, principalmente em pistas molhadas, trazendo conforto e estabilidade na condução.',
      installments: '6x de R$ 76,65 sem juros',
      active: true,
    },
    {
      id: 'tire-5',
      storeId: 'store-1',
      name: 'Alenza 001',
      brand: 'Bridgestone',
      aro: '18',
      medida: '235/60 R18',
      price: 949.90,
      stock: false,
      image: 'https://images.unsplash.com/photo-1611245353597-90f77d33d997?auto=format&fit=crop&q=80&w=400',
      description: 'Projetado para SUVs de luxo, o Bridgestone Alenza 001 é projetado especificamente para maximizar o potencial em piso molhado e seco com extremo conforto e durabilidade.',
      installments: '10x de R$ 94,99 sem juros',
      active: true,
    }
  ],
  compatibility: [
    { id: 'c-1', storeId: 'store-1', tireId: 'tire-1', brand: 'Chevrolet', model: 'Onix', year: '2020', version: '1.0 Turbo Premier' },
    { id: 'c-2', storeId: 'store-1', tireId: 'tire-1', brand: 'Hyundai', model: 'HB20', year: '2021', version: '1.0 TGDI Evolution' },
    { id: 'c-3', storeId: 'store-1', tireId: 'tire-2', brand: 'Volkswagen', model: 'Polo', year: '2021', version: '1.0 TSI Comfortline' },
    { id: 'c-4', storeId: 'store-1', tireId: 'tire-2', brand: 'Toyota', model: 'Corolla', year: '2015', version: '2.0 XEi' },
    { id: 'c-5', storeId: 'store-1', tireId: 'tire-2', brand: 'Honda', model: 'Civic', year: '2016', version: '2.0 LXR' },
    { id: 'c-6', storeId: 'store-1', tireId: 'tire-3', brand: 'Toyota', model: 'Corolla', year: '2020', version: '2.0 Altis Premium' },
    { id: 'c-7', storeId: 'store-1', tireId: 'tire-3', brand: 'Volkswagen', model: 'Golf', year: '2018', version: '1.4 TSI Highline' },
    { id: 'c-8', storeId: 'store-1', tireId: 'tire-3', brand: 'Audi', model: 'A3 Sedan', year: '2019', version: '2.0 TFSI' },
    { id: 'c-9', storeId: 'store-1', tireId: 'tire-4', brand: 'Hyundai', model: 'HB20', year: '2019', version: '1.0 Unique' },
    { id: 'c-10', storeId: 'store-1', tireId: 'tire-4', brand: 'Chevrolet', model: 'Onix', year: '2018', version: '1.4 LT' },
    { id: 'c-11', storeId: 'store-1', tireId: 'tire-4', brand: 'Renault', model: 'Sandero', year: '2020', version: '1.0 Zen' },
    { id: 'c-12', storeId: 'store-1', tireId: 'tire-5', brand: 'Jeep', model: 'Compass', year: '2021', version: '2.0 Flex Limited' },
    { id: 'c-13', storeId: 'store-1', tireId: 'tire-5', brand: 'Volvo', model: 'XC60', year: '2018', version: '2.0 T5 Momentum' }
  ],
  leads: [
    {
      id: 'lead-1',
      storeId: 'store-1',
      tireId: 'tire-1',
      tireName: 'Michelin Primacy 4 195/55 R16',
      vehicleInfo: 'Chevrolet Onix 2020 (1.0 Turbo Premier)',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'lead-2',
      storeId: 'store-1',
      tireId: 'tire-3',
      tireName: 'Goodyear Eagle F1 Asymmetric 5 225/45 R17',
      vehicleInfo: 'Busca direta no catálogo',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'lead-3',
      storeId: 'store-1',
      tireId: 'tire-2',
      tireName: 'Pirelli Cinturato P7 205/55 R16',
      vehicleInfo: 'Volkswagen Polo 2021 (1.0 TSI Comfortline)',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    }
  ]
};

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
    console.log('✅ database.json criado com dados iniciais de mock.');
    return INITIAL_DATA;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(raw);

  // Simple migration if users collection is missing
  if (!db.users) {
    console.log('🔄 Migrando banco de dados para nova estrutura...');
    db.users = [];
    db.stores.forEach(s => {
      const userId = `user-${s.id}`;
      db.users.push({
        id: userId,
        name: s.ownerName || 'Lojista',
        email: s.ownerEmail,
        password: s.ownerPassword,
        phone: s.phone,
        role: 'admin',
        createdAt: s.createdAt
      });
      s.ownerId = userId;
      s.whatsapp = s.phone;
      s.city = '';
      s.state = '';
      s.banner = '';
      s.cover = '';
      s.seoTitle = '';
      s.seoDescription = '';
      delete s.ownerEmail;
      delete s.ownerPassword;
      delete s.ownerName;
    });
    writeDB(db);
    console.log('✅ Migração concluída.');
  }
  return db;
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// --- AUTH ROUTES ---

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "").trim();

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const db = readDB();
  const user = db.users.find(u => 
    String(u.email || "").trim().toLowerCase() === email && 
    String(u.password || "").trim() === password
  );
  
  if (user) {
    const store = db.stores.find(s => s.ownerId === user.id);
    if (!store) {
      return res.status(404).json({ error: 'Nenhuma loja vinculada a este usuário.' });
    }
    return res.json({ ...store, user });
  }
  return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, phone, storeName } = req.body;
  const email = String(req.body.ownerEmail || req.body.email || "").trim().toLowerCase();
  const password = String(req.body.ownerPassword || req.body.password || "").trim();

  if (!email || !password || !name || !storeName) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  const db = readDB();

  const emailExists = db.users.some(u => 
    String(u.email || "").trim().toLowerCase() === email
  );
  
  if (emailExists) {
    return res.status(409).json({ error: 'Este endereço de e-mail já está sendo utilizado.' });
  }

  const userId = `user-${Date.now()}`;
  const newUser = {
    id: userId,
    name: String(name).trim(),
    email: email,
    password: password,
    phone: String(phone || "").trim(),
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  const newStore = {
    id: `store-${Date.now()}`,
    ownerId: userId,
    slug: String(storeName).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
    name: String(storeName).trim(),
    whatsapp: String(phone || "").trim(),
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
  
  return res.status(201).json({ ...newStore, user: newUser });
});

// --- STORE ROUTES ---

app.get('/api/stores/:id', (req, res) => {
  const db = readDB();
  const store = db.stores.find(s => s.id === req.params.id);
  if (store) {
    const user = db.users.find(u => u.id === store.ownerId);
    return res.json({ ...store, user });
  }
  return res.status(404).json({ error: 'Loja não encontrada' });
});

app.get('/api/stores/slug/:slug', (req, res) => {
  const db = readDB();
  const store = db.stores.find(s => s.slug === req.params.slug);
  if (store) {
    const user = db.users.find(u => u.id === store.ownerId);
    return res.json({ ...store, user });
  }
  return res.status(404).json({ error: 'Loja não encontrada' });
});

app.get('/api/stores', (req, res) => {
  const db = readDB();
  return res.json(db.stores);
});

app.put('/api/stores/:id', (req, res) => {
  const db = readDB();
  const index = db.stores.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Loja não encontrada' });

  db.stores[index] = { ...db.stores[index], ...req.body };
  writeDB(db);
  return res.json(db.stores[index]);
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
  // Also remove compatibility mappings
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

// --- VEHICLE SEARCH (Find Tires by Vehicle) ---

app.get('/api/tires/search/vehicle', (req, res) => {
  const { storeId, brand, model, year, version } = req.query;
  const db = readDB();

  const comps = db.compatibility.filter(c => {
    const matchStore = c.storeId === storeId;
    const matchBrand = c.brand.toLowerCase() === (brand || '').toLowerCase();
    const matchModel = c.model.toLowerCase() === (model || '').toLowerCase();
    const matchYear = c.year === year;
    const matchVersion = !version || c.version.toLowerCase() === version.toLowerCase();
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
  let result = db.leads;
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

  // Resolve tire name
  const tire = db.tires.find(t => t.id === tireId);
  const newLead = {
    id: `lead-${Date.now()}`,
    storeId,
    tireId,
    tireName: tire ? `${tire.brand} ${tire.name} ${tire.medida}` : 'Pneu Desconhecido',
    vehicleInfo: vehicleInfo || '',
    timestamp: new Date().toISOString()
  };
  db.leads.push(newLead);
  writeDB(db);
  return res.status(201).json(newLead);
});

app.delete('/api/leads/:id', (req, res) => {
  const db = readDB();
  db.leads = db.leads.filter(l => l.id !== req.params.id);
  writeDB(db);
  return res.json({ success: true });
});

// --- Start ---
app.listen(PORT, () => {
  // Ensure DB exists
  readDB();
  console.log(`🚀 PneuFlow API rodando em http://localhost:${PORT}`);
});
