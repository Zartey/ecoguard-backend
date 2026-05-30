# EcoGuard com Banco de Dados

Este pacote já vem com:

- App Expo/React Native usando API em vez de salvar tudo só no AsyncStorage.
- Backend Node.js + Express.
- Banco SQLite local em `backend/ecoguard.db`.
- Registro de usuários, login, auditoria de acessos, denúncias, notificações e recuperação de senha.

## 1. Instalar dependências do app

Na pasta principal:

```bash
npm install
```

## 2. Instalar dependências do backend

```bash
cd backend
npm install
npm start
```

A API deve abrir em:

```text
http://localhost:3001
```

Teste no navegador:

```text
http://localhost:3001/health
```

## 3. Rodar o aplicativo

Em outro terminal, volte para a pasta principal:

```bash
npm start
```

## 4. Importante para celular físico

Abra o arquivo:

```text
config/api.js
```

Troque:

```js
const PC_LAN_URL = "http://SEU_IP_DO_PC:3001";
```

pelo IP do seu computador na mesma rede Wi-Fi, por exemplo:

```js
const PC_LAN_URL = "http://192.168.1.50:3001";
```

No Windows, descubra seu IP com:

```bash
ipconfig
```

Procure por `Endereço IPv4`.

## 5. Login administrador padrão

```text
Usuário: admin
Senha: admin123
```

## Observação

O app agora salva no banco por meio da API. O React Native não deve se conectar diretamente ao banco, porque isso expõe usuário, senha, IP e estrutura do banco dentro do aplicativo.
