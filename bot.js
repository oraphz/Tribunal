const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, Events, SlashCommandBuilder} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { sendTicketTranscript } = require('./transcript'); // Função para gerar o transcript
const { GuildMember } = require('discord.js');


// Configuração do Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Definindo IDs e variáveis
const GUILD_ID = '1343981529180798976'; // ID do servidor
const TICKET_CHANNEL_ID = '1344094042354356385'; // Canal onde a mensagem de tickets será fixada
const SUPPORT_ROLE_ID = '1344827633027907698'; // Cargo da equipa de suporte
// const TRANSCRIPT_CHANNEL_ID = '1348962636254941246'; // Canal de transcrições
// const transcriptChannelId = '1348962636254941246'; // Canal para enviar o transcript
const verificationChannelId = '1344092239160147968'; // Canal de verificação
const roleId = '1344822739231572069'; // ID da role de verificação

// Tipos de ticket e categorias
const ticketCategories = [
  { name: 'Processo Penal', label: '📝 Processo Penal', description: 'Consultas sobre processos penais, queixas e audiências.' },
  { name: 'Recurso', label: '⚖️ Abertura de Recurso', description: 'Caso não tenha concordado com a sentença, você pode abrir um recurso.' },
  { name: 'Legalizações Empresariais', label: '🏢 Legalizações Empresariais', description: 'Registo de empresas e consultoria sobre documentos.' },
  { name: 'Legalização de Viaturas', label: '🚗 Legalização de Viaturas', description: 'Legalização de veículos, registos e licenciamento.' },
  { name: 'Pulseiras Eletrônicas', label: '⛓️ Pulseiras Eletrônicas', description: 'Solicitações para instalação ou remoção de pulseiras.' },
  { name: 'Agendamento', label: '📅 Agendamento', description: 'Agendamento de atendimentos, audiências e consultas.' },
  { name: 'Remoção de Registo Criminal', label: '🗑️ Remoção de Registo Criminal', description: 'Solicitação para remoção de registos criminais e históricos.' }
];

// Embed principal com opções de ticket (visual aprimorado)
const embedTicket = new EmbedBuilder()
  .setColor('#8A2BE2') // Cor roxa elegante
  .setTitle('⚖️ **Bem-vindo ao Tribunal - Sistema de Tickets**')
  .setDescription(
    '📌 **Escolhe a categoria adequada para o seu atendimento:**\n\n' +
    '🔹 Para garantir um suporte eficiente, seleciona a opção mais adequada abaixo.\n' +
    '🔹 Um membro da comarca responderá assim que possível.\n\n' +
    '💡 **Nota:** Evite abrir múltiplos tickets sobre o mesmo assunto.'
  )
  .addFields(
    { name: '📜 **Como Funciona?**', value: '1️⃣ Escolhe a categoria abaixo.\n2️⃣ Um canal privado será criado.\n3️⃣ Um membro da comarca responderá em breve.' },
    { name: '⚠️ **Regras do Ticket**', value: '✅ Seja respeitoso e objetivo.\n✅ Forneça todas as informações necessárias.\n❌ Não abuses do sistema.\n❌ A abertura de tickets desnecessários pode levar a punições.' }
  )
  .setThumbnail('https://r2.fivemanage.com/vaMjart5DMZrcUigoNkWc/image/SPNB.png') // Ícone do tribunal
  .setFooter({ text: 'Suporte Judiciário | 2025 HavenRP', iconURL: 'https://r2.fivemanage.com/vaMjart5DMZrcUigoNkWc/image/SPNB.png' });

// Criando um menu suspenso para selecionar o tipo de ticket
const selectMenu = new ActionRowBuilder().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('ticket_selecao')
    .setPlaceholder('📌 Selecione a opção desejada...')
    .addOptions(
      ticketCategories.map(category => 
        new StringSelectMenuOptionBuilder()
          .setLabel(category.label)
          .setValue(category.name)
          .setDescription(category.description)
      )
    )
);

// Quando o bot se conecta
client.once('ready', async () => {
  console.log('✅ Bot está online!');

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error('❌ Servidor não encontrado.');
    return;
  }

  const ticketChannel = guild.channels.cache.get(TICKET_CHANNEL_ID);
  if (!ticketChannel) {
    console.error('❌ Canal de tickets não encontrado.');
    return;
  }

  try {
    // Criar categorias, se não existirem
    for (const category of ticketCategories) {
      let existingCategory = guild.channels.cache.find(c => c.name.toLowerCase() === category.name.toLowerCase() && c.type === ChannelType.GuildCategory);

      if (!existingCategory) {
        // Criando uma nova categoria
        await guild.channels.create({
          name: category.name,
          type: ChannelType.GuildCategory,
        });
        console.log(`Categoria criada: ${category.name}`);
      } else {
        console.log(`Categoria já existe: ${category.name}`);
      }
    }

    // Verifica se já existe uma mensagem do bot fixada
    const messages = await ticketChannel.messages.fetch();
    let existingMessage = messages.find(msg => msg.author.id === client.user.id);

    if (!existingMessage) {
      // Se a mensagem não estiver fixada, cria e fixa
      const sentMessage = await ticketChannel.send({ embeds: [embedTicket], components: [selectMenu] });
      await sentMessage.pin();
      console.log('📌 Mensagem de ticket fixada com sucesso!');
    } else {
      console.log('📌 Mensagem já estava fixada.');
      existingMessage = await ticketChannel.messages.fetch(existingMessage.id); // Pega a mensagem existente para edições
          // Atualiza a mensagem fixada com novos dados
          await existingMessage.edit({
            embeds: [embedTicket],  // Atualiza o embed com o conteúdo do sistema de tickets
            components: [selectMenu] // Atualiza o menu suspenso de categorias
          });
        }
  } catch (err) {
    console.error('Erro ao verificar ou enviar mensagem de ticket:', err);
  }
});

// Registar o comando /rename para renomear o canal do ticket
client.on('ready', async () => {
  const commands = [
    new SlashCommandBuilder()
      .setName('rename')
      .setDescription('Renomeia o canal do ticket')
      .addStringOption(option =>
        option.setName('nome_do_ticket')
          .setDescription('Novo nome para o ticket')
          .setRequired(true)
      ),
  ];

  await client.guilds.cache.get(GUILD_ID).commands.set(commands);
});

// Lidar com as interações de tickets
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_selecao') {
    // Código existente para interações do tipo de ticket...
  }

  // Lidar com a interação do comando /rename
  if (interaction.isCommand() && interaction.commandName === 'rename') {
    const ticketChannel = interaction.channel;
    const newName = interaction.options.getString('nome_do_ticket'); // Obtém o novo nome do ticket

    // Verifica se o canal é um ticket
    if (!ticketChannel.name.startsWith('🎫-')) {
      return await interaction.reply({ content: '❌ Este canal não é um ticket.', ephemeral: true });
    }

    try {
      // Renomeia o canal
      await ticketChannel.setName(`🎫-${newName}`);
      await interaction.reply({ content: `✅ O ticket foi renomeado para: **${newName}**.`, ephemeral: true });
    } catch (error) {
      console.error('Erro ao renomear o canal:', error);
      await interaction.reply({ content: '❌ Ocorreu um erro ao tentar renomear o ticket. Tente novamente mais tarde.', ephemeral: true });
    }
  }
});

// Função para salvar o transcript do ticket
async function saveTicketTranscript(ticketChannel) {
  try {
    // Pega todas as mensagens no canal de ticket
    const messages = await ticketChannel.messages.fetch({ limit: 100 }); // Ajuste o número conforme necessário

    // Cria um arquivo de texto com o conteúdo das mensagens
    const transcript = messages
      .reverse() // Reverte para a ordem correta
      .map(msg => `[${msg.author.tag}] ${msg.content}`)
      .join('\n');

    // Define o caminho do arquivo de transcript
    const filePath = path.join(__dirname, 'transcripts', `${ticketChannel.name}-transcript.txt`);

    // Cria o diretório 'transcripts' se não existir
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath));
    }

    // Salva o transcript no arquivo
    fs.writeFileSync(filePath, transcript);
    console.log(`Transcript do ticket ${ticketChannel.name} salvo em ${filePath}`);

    return filePath;
  } catch (error) {
    console.error('Erro ao salvar o transcript:', error);
    return null;
  }
}

// Interações de tickets
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_selecao') {
    const selectedValue = interaction.values[0]; // Valor selecionado
    const userId = interaction.user.id; // ID do usuário
    const guild = interaction.guild; // Servidor

    try {
      // Verifica se a interação foi deferida antes de continuar
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }); // Deferir a interação se ainda não foi respondida
      }

      // Verifica se a categoria existe
      let ticketCategory = guild.channels.cache.find(c => c.name === selectedValue && c.type === ChannelType.GuildCategory);

      if (!ticketCategory) {
        console.error(`❌ Categoria não encontrada: ${selectedValue}`);
        return await interaction.followUp({ content: '❌ Não foi possível encontrar a categoria solicitada. Tente novamente mais tarde.', flags: 64 });
      }

      // Criando o canal do ticket
      const ticketChannel = await guild.channels.create({
        name: `🎫-${interaction.user.username}-${selectedValue}`,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: SUPPORT_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
        ]
      });

      console.log(`Canal de ticket criado: ${ticketChannel.name}`);

      // Mensagem no canal do ticket
      const embedTicketChannel = new EmbedBuilder()
        .setColor('#8A2BE2')
        .setTitle('🎫 **Ticket Aberto**')
        .setDescription(`🔒 **Ticket Aberto com Sucesso!**\n\nOlá ${interaction.user}, o teu ticket foi aberto com sucesso e está a aguardar a atenção de um dos nossos membros da comarca.\n\n**📌 Categoria Selecionada**: ${selectedValue.charAt(0).toUpperCase() + selectedValue.slice(1)}\n\n💼 Um dos nossos membros estará a analisar o teu caso e responderá o mais breve possível.\n\n⚙️ **O que fazer agora?**\n- Aguarda enquanto preparamos as informações necessárias para a tua solicitação.\n- Não hesites em fornecer mais detalhes, se necessário, para agilizar o atendimento.\n\n🔔 **Estado**: Aberto - Em breve, um membro da equipa entrará em contacto.\n\n💬 Caso tenhas alguma dúvida adicional, não hesites em enviar-nos uma mensagem aqui no canal!\n\nAgradecemos por utilizares o nosso sistema de suporte!\n\n🔗 **Suporte Judiciário | 2025 HavenRP`)
        .setFooter({ text: 'Suporte Judiciário', iconURL: 'https://r2.fivemanage.com/vaMjart5DMZrcUigoNkWc/image/SPNB.png' });

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ embeds: [embedTicketChannel], components: [closeButton] });

      // Registra o ticket no banco de dados
      const createdAt = new Date().toISOString();
      db.run('INSERT INTO Tickets (userId, channelId, status, createdAt, updatedAt) VALUES (?, ?, "open", ?, ?)', 
        [userId, ticketChannel.id, createdAt, createdAt]);

      console.log(`Ticket registrado no banco de dados para o usuário: ${userId}`);

      // Responde ao usuário
      await interaction.followUp({ content: `✅ O teu ticket foi criado em: ${ticketChannel}`, flags: 64 });
    } catch (error) {
      console.error('Erro ao processar a interação do ticket:', error);
      if (!interaction.replied) {
        await interaction.followUp({ content: '❌ Ocorreu um erro ao criar o teu ticket. Tente novamente mais tarde.', flags: 64 });
      }
    }
  }

  // Interação para fechar o ticket
  if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
    try {
      // Garantir que a interação foi deferida antes de responder
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const confirmationEmbed = new EmbedBuilder()
        .setColor('#8A2BE2')
        .setTitle('❗ Confirmação de encerramento')
        .setDescription('Tens a certeza que deseja fechar este ticket?')
        .setFooter({ text: 'Clica no botão abaixo para confirmares o encerramento.' });

      const confirmationButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirmar_encerramento').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancelar_encerramento').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
      );

      await interaction.followUp({ embeds: [confirmationEmbed], components: [confirmationButton] });
    } catch (error) {
      console.error('Erro ao processar o encerramento do ticket:', error);
    }
  }

  // Confirmação para fechar o ticket
  if (interaction.isButton() && interaction.customId === 'confirmar_encerramento') {
    const ticketChannel = interaction.channel;
    const userId = interaction.user.id;

    try {
      // Salvar transcrição antes de fechar o ticket
      await saveTicketTranscript(ticketChannel, userId);

      // Atualiza o banco de dados para status fechado
      const updatedAt = new Date().toISOString();
      db.run('UPDATE Tickets SET status = "closed", updatedAt = ? WHERE channelId = ?', [updatedAt, ticketChannel.id]);

      // Fecha o canal
      ticketChannel.delete();
      console.log(`Ticket fechado e canal apagado: ${ticketChannel.name}`);
      
      await interaction.followUp({ content: '✅ O ticket foi fechado com sucesso!', ephemeral: true });
    } catch (error) {
      console.error('Erro ao fechar o ticket:', error);
    }
  }

  // Cancelamento do encerramento do ticket
  if (interaction.isButton() && interaction.customId === 'cancelar_encerramento') {
    try {
      await interaction.followUp({ content: '❌ O encerramento do ticket foi cancelado.', ephemeral: true });
    } catch (error) {
      console.error('Erro ao cancelar o encerramento:', error);
    }
  }
});

// Embed para a mensagem de verificação
const embedVerification = new EmbedBuilder()
  .setColor('#8A2BE2') // Cor roxa elegante (mesma cor do embed de ticket)
  .setTitle('🔒 **Sala de Verificação**')
  .setDescription(
    '📌 **Bem-vindo à sala de verificação!**\n\n' +
    '🔹 Para acederes ao Tribunal e todas as suas funcionalidades, basta clicares no botão de verificação abaixo.\n' +
    '🔹 Um membro da comarca estará à disposição caso tenhas dúvidas ou problemas com o processo de verificação.\n\n' +
    '💡 **Nota:** Se encontrares algum problema, entra em contato com o Presidente.'
  )
  .addFields(
    { name: '🔑 **Como Funciona?**', value: '1️⃣ Clica no botão "Verificar".\n2️⃣ Ser-te-à dada a role de civil.\n3️⃣ Acesso completo ao Tribunal liberado após verificação.' },
    { name: '⚠️ **Importante!**', value: '✅ Certifica-te de clicares no botão corretamente.\n❌ Não cliques múltiplas vezes no botão.' }
  )
  .setThumbnail('https://r2.fivemanage.com/vaMjart5DMZrcUigoNkWc/image/SPNB.png') // Ícone do processo de verificação
  .setFooter({ text: 'Verificação | 2025 HavenRP', iconURL: 'https://r2.fivemanage.com/vaMjart5DMZrcUigoNkWc/image/SPNB.png' });

// Criando o botão de verificação
const buttonVerify = new ButtonBuilder()
  .setCustomId('verify')
  .setLabel('Verificar')
  .setStyle(ButtonStyle.Primary);

// Criando a linha de ação para o botão
const rowVerify = new ActionRowBuilder().addComponents(buttonVerify);

// Quando o bot se conecta
client.once('ready', async () => {
  console.log('✅ Bot está online!');

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error('❌ Servidor não encontrado.');
    return;
  }

  const verificationChannel = guild.channels.cache.get(verificationChannelId);
  if (!verificationChannel) {
    console.error('❌ Canal de verificação não encontrado.');
    return;
  }

  try {
    // Verifica se já existe uma mensagem do bot fixada
    const messages = await verificationChannel.messages.fetch();
    let existingMessage = messages.find(msg => msg.author.id === client.user.id);

    if (!existingMessage) {
      // Se a mensagem não estiver fixada, cria e fixa
      const sentMessage = await verificationChannel.send({
        embeds: [embedVerification],
        components: [rowVerify]
      });
      await sentMessage.pin();
      console.log('📌 Mensagem de verificação fixada com sucesso!');
    } else {
      console.log('📌 Mensagem de verificação já estava fixada.');
      existingMessage = await verificationChannel.messages.fetch(existingMessage.id); // Pega a mensagem existente para edições

          // Atualiza a mensagem fixada com novos dados
          await existingMessage.edit({
            embeds: [embedVerification],  // Aqui você pode atualizar o embed com novas informações
            components: [rowVerify]        // Se necessário, também pode atualizar os componentes (botões, etc.)
          });
        }
      } catch (err) {
        console.error('Erro ao verificar ou enviar mensagem de verificação:', err);
      }
    });
    
// Lida com interações dos botões
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== 'verify') return;

  const member = interaction.member;
  if (!member || !(member instanceof interaction.guild.members.constructor)) return;  // Usando a construção correta para garantir o tipo GuildMember.

  try {
    if (member.roles.cache.has(roleId)) {
      return interaction.reply({ content: 'Você já foi verificado!', ephemeral: true });
    }
    await member.roles.add(roleId);
    await interaction.reply({ content: 'Você foi verificado com sucesso!', ephemeral: true });
    console.log(`${interaction.user.tag} foi verificado e recebeu a role.`);
  } catch (error) {
    console.error('Erro ao verificar o membro:', error);
    interaction.reply({ content: 'Ocorreu um erro ao realizar a verificação. Tente novamente.', ephemeral: true });
  }
});

client.on('interactionCreate', async (interaction) => {
  // Verifica se a interação é do tipo botão
  if (!interaction.isButton()) return;

  if (interaction.customId === 'verify') {
    try {
      // Recupera o membro que clicou no botão
      const member = await interaction.guild.members.fetch(interaction.user.id);

      // Verifica se o membro já tem a role de verificação
      if (member.roles.cache.has(roleId)) {
        return interaction.reply({ content: 'Você já foi verificado!', ephemeral: true });
      }

      // Adiciona a role de verificação ao membro
      await member.roles.add(roleId);

      // Responde ao usuário
      await interaction.reply({ content: 'Você foi verificado com sucesso!', ephemeral: true });

      console.log(`${interaction.user.tag} foi verificado e recebeu a role.`);
    } catch (err) {
      console.error('Erro ao verificar o membro:', err);
      interaction.reply({ content: 'Ocorreu um erro ao realizar a verificação. Tente novamente.', ephemeral: true });
    }
  }
});

// Evento quando um canal de ticket é apagado
client.on(Events.ChannelDelete, async (channel) => {
  if (channel.type !== 'GUILD_TEXT') return; // 
  if (!channel.name.startsWith('ticket-')) return; //

  try {
    const ticketId = channel.id;

    // Coletar todas as mensagens do canal do ticket
    const messages = await channel.messages.fetch({ limit: 10000000 }); // Ajuste o limite conforme necessário

    // Chama a função para gerar e enviar o transcript diretamente para o canal
    await sendTicketTranscript(messages, transcriptChannelId, ticketId);

    console.log(`Transcript do ticket #${ticketId} enviado para o canal de transcripts.`);
  } catch (err) {
    console.error(`Erro ao processar o encerramento do ticket: ${err.message}`);
  }
});

// Login do bot (use seu token aqui)
client.login('MTMzMTA4NzY5OTAxNjQxNzM2MQ.GdGt4y.7-ZhyfOHXCORfQZgxIvtXoVPmp2ug5xv48WFQo');