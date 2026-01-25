# SecureNotes
WebApp per condividere note testuali cifrate tramite blockchain Ethereum, che possono essere lette una sola volta, e messaggi di auguri acquistabili con Ethers.

Per avviare il progetto:
Installare i pacchetti necessari:
npm install
npx hardhat node

Deploy del contratto
npx hardhat run scripts/deploy.js --network localhost

Aggiungere i simboli
npx hardhat run scripts/seed.js --network localhost

Avviare il server
npx http-server ./frontend

Avviare la webapp
http://127.0.0.1:8080

!Metamask deve essere acceso per poter interagire con la webapp e connesso a Localhost 8545!