// transcript.js

const { MessageAttachment } = require('discord.js');

/**
 * Função para gerar e enviar o transcript de um ticket diretamente para o Discord
 * @param {Collection} messages - Coleção de mensagens do canal do ticket
 * @param {TextChannel} channel - Canal onde o transcript será enviado
 * @param {string} ticketId - ID único do ticket
 */
async function sendTicketTranscript(messages, channel, ticketId) {
  let transcriptContent = `Transcript do Ticket #${ticketId}:\n\n`;

  // Coletar todas as mensagens do canal
  messages.forEach((message) => {
    transcriptContent += `${message.author.tag}: ${message.content}\n`;
  });

  // Criar uma attachment de texto para o Discord
  const transcriptAttachment = new MessageAttachment(Buffer.from(transcriptContent), `ticket_${ticketId}.txt`);

  // Enviar o arquivo para o canal de "transcripts"
  try {
    await channel.send({
      content: `Aqui está o transcript do ticket #${ticketId}:`,
      files: [transcriptAttachment]
    });

    console.log(`Transcript do ticket #${ticketId} enviado para o canal com sucesso.`);
  } catch (err) {
    console.error(`Erro ao enviar o transcript do ticket #${ticketId}:`, err);
  }
}

module.exports = {
  sendTicketTranscript
};
