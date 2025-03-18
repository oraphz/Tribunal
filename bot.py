import discord
from discord.ext import commands
from discord import app_commands
import os
from discord.ui import Button, View, Select #SelectOption
import datetime

# Configuração do Bot
intents = discord.Intents.default()
intents.messages = True
intents.guilds = True
intents.message_content = True

bot = commands.Bot(command_prefix="/", intents=intents)

# Dados em memória
tickets_data = {}

# Definindo IDs e variáveis
GUILD_ID = 1343981529180798976
TICKET_CHANNEL_ID = 1344094042354356385
SUPPORT_ROLE_ID = 1344827633027907698
TRANSCRIPT_CHANNEL_ID = 1348962636254941246
VERIFICATION_CHANNEL_ID = 1344092239160147968
ROLE_ID = 1344822739231572069  # ID da role de verificação

# Tipos de tickets
ticket_categories = [
    {'name': 'Processo Penal', 'label': '📝 Processo Penal', 'description': 'Consultas sobre processos penais, queixas e audiências.'},
    {'name': 'Recurso', 'label': '⚖️ Abertura de Recurso', 'description': 'Caso não tenha concordado com a sentença, você pode abrir um recurso.'},
    {'name': 'Legalizações Empresariais', 'label': '🏢 Legalizações Empresariais', 'description': 'Registro de empresas e consultoria sobre documentos.'},
    {'name': 'Legalização de Viaturas', 'label': '🚗 Legalização de Viaturas', 'description': 'Legalização de veículos, registros e licenciamento.'},
    {'name': 'Pulseiras Eletrônicas', 'label': '⛓️ Pulseiras Eletrônicas', 'description': 'Solicitações para instalação ou remoção de pulseiras.'},
    {'name': 'Agendamento', 'label': '📅 Agendamento', 'description': 'Agendamento de atendimentos, audiências e consultas.'},
    {'name': 'Remoção de Registro Criminal', 'label': '🗑️ Remoção de Registro Criminal', 'description': 'Solicitação para remoção de registros criminais e históricos.'}
]

# Função para salvar o transcript do ticket
async def save_ticket_transcript(ticket_channel):
    try:
        # Pega todas as mensagens no canal de ticket
        messages = await ticket_channel.history(limit=100).flatten()

        # Cria um arquivo de texto com o conteúdo das mensagens
        transcript = "\n".join([f"[{msg.author}] {msg.content}" for msg in messages[::-1]])

        # Define o caminho do arquivo de transcript
        file_path = f'transcripts/{ticket_channel.name}-transcript.txt'

        # Cria o diretório 'transcripts' se não existir
        if not os.path.exists(os.path.dirname(file_path)):
            os.makedirs(os.path.dirname(file_path))

        # Salva o transcript no arquivo
        with open(file_path, 'w') as file:
            file.write(transcript)

        print(f"Transcript do ticket {ticket_channel.name} salvo em {file_path}")
        return file_path
    except Exception as e:
        print(f"Erro ao salvar o transcript: {e}")
        return None

# Criação do menu de seleção de tickets
class MySelect(Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="Option 1", value="1"),
            discord.SelectOption(label="Option 2", value="2")
        ]
        super().__init__(placeholder="Escolha uma opção", options=options)

    async def callback(self, interaction):
        await interaction.response.send_message(f'Você selecionou {self.values[0]}')

class MyView(View):
    def __init__(self):
        super().__init__()
        self.add_item(MySelect())

    async def callback(self, interaction: discord.Interaction):
        category_name = self.values[0]
        user_id = interaction.user.id
        guild = interaction.guild

        try:
            # Verifica se a categoria existe
            ticket_category = discord.utils.get(guild.categories, name=category_name)

            if not ticket_category:
                return await interaction.response.send_message('Categoria não encontrada. Tente novamente mais tarde.', ephemeral=True)

            # Criando o canal do ticket
            ticket_channel = await guild.create_text_channel(
                f"🎫-{interaction.user.name}-{category_name}",
                category=ticket_category,
                overwrites={
                    guild.default_role: discord.PermissionOverwrite(view_channel=False),
                    interaction.user: discord.PermissionOverwrite(view_channel=True, send_messages=True),
                    guild.get_role(SUPPORT_ROLE_ID): discord.PermissionOverwrite(view_channel=True, send_messages=True),
                }
            )

            print(f"Canal de ticket criado: {ticket_channel.name}")

            # Mensagem no canal do ticket
            embed_ticket = discord.Embed(
                color=0x8A2BE2,
                title="🎫 Ticket Aberto",
                description=f"🔒 **Ticket Aberto com Sucesso!**\n\nOlá {interaction.user.mention}, seu ticket foi aberto com sucesso e está aguardando a atenção de um membro da comarca.\n\n**📌 Categoria Selecionada**: {category_name.capitalize()}\n\n⚙️ **O que fazer agora?**\nAguarde a análise do seu caso. Caso tenha mais informações, envie uma mensagem aqui."
            )
            close_button = Button(style=discord.ButtonStyle.danger, label="Fechar Ticket", custom_id="fechar_ticket")

            # Envia a mensagem
            await ticket_channel.send(embed=embed_ticket, components=[close_button])

            # Armazenando os dados do ticket na memória
            created_at = datetime.datetime.utcnow().isoformat()
            tickets_data[ticket_channel.id] = {
                'user_id': user_id,
                'category': category_name,
                'status': 'open',
                'created_at': created_at,
                'updated_at': created_at
            }

            await interaction.response.send_message(f"✅ Seu ticket foi criado em: {ticket_channel.mention}", ephemeral=True)

        except Exception as e:
            print(f"Erro ao processar a interação do ticket: {e}")
            await interaction.response.send_message('❌ Ocorreu um erro ao criar o seu ticket. Tente novamente mais tarde.', ephemeral=True)


# Criação do botão de verificação
class VerifyButton(Button):
    def __init__(self):
        super().__init__(label="Verificar", style=discord.ButtonStyle.primary, custom_id="verify")

    async def callback(self, interaction: discord.Interaction):
        member = interaction.user
        if member.get_role(ROLE_ID):
            return await interaction.response.send_message('Você já foi verificado!', ephemeral=True)

        try:
            # Adiciona a role de verificação
            await member.add_roles(discord.utils.get(member.guild.roles, id=ROLE_ID))
            await interaction.response.send_message('Você foi verificado com sucesso!', ephemeral=True)
            print(f"{interaction.user} foi verificado e recebeu a role.")
        except Exception as e:
            print(f"Erro ao verificar o membro: {e}")
            await interaction.response.send_message('Ocorreu um erro ao realizar a verificação. Tente novamente.', ephemeral=True)


# Comandos do bot
@bot.event
async def on_ready():
    print(f'Bot conectado como {bot.user}')
    guild = discord.utils.get(bot.guilds, id=GUILD_ID)

    if not guild:
        print(f'❌ Servidor não encontrado.')
        return

    # Canal de tickets
    ticket_channel = discord.utils.get(guild.text_channels, id=TICKET_CHANNEL_ID)
    if not ticket_channel:
        print(f'❌ Canal de tickets não encontrado.')
        return

    # Canal de verificação
    verification_channel = discord.utils.get(guild.text_channels, id=VERIFICATION_CHANNEL_ID)
    if not verification_channel:
        print(f'❌ Canal de verificação não encontrado.')
        return

    # Enviar a mensagem de verificação
    embed_verification = discord.Embed(
        color=0x8A2BE2,
        title="🔒 Sala de Verificação",
        description="Para acessar o Tribunal, clique no botão abaixo para verificar sua conta."
    )
    view_verify = View()
    view_verify.add_item(VerifyButton())
    await verification_channel.send(embed=embed_verification, view=view_verify)

    # Enviar a mensagem de tickets
    embed_ticket = discord.Embed(
        color=0x8A2BE2,
        title="⚖️ **Bem-vindo ao Tribunal - Sistema de Tickets**",
        description="Escolha a categoria para abrir um ticket."
    )
    view_ticket = View()
    view_ticket.add_item(TicketSelect())
    await ticket_channel.send(embed=embed_ticket, view=view_ticket)

@bot.command()
async def select(ctx):
    view = MyView()
    await ctx.send("Escolha uma opção", view=view)


# Comando para renomear o ticket
@bot.tree.command(name="rename", description="Renomeia o canal do ticket")
@app_commands.describe(ticket_name="Novo nome para o ticket")
async def rename_ticket(interaction: discord.Interaction, ticket_name: str):
    ticket_channel = interaction.channel
    if not ticket_channel.name.startswith("🎫-"):
        return await interaction.response.send_message("❌ Este canal não é um ticket.", ephemeral=True)

    try:
        await ticket_channel.edit(name=f"🎫-{ticket_name}")
        await interaction.response.send_message(f"✅ O nome do ticket foi alterado para: **{ticket_name}**.", ephemeral=True)
    except Exception as e:
        print(f"Erro ao renomear o canal: {e}")
        await interaction.response.send_message("❌ Ocorreu um erro ao renomear o canal. Tente novamente.", ephemeral=True)


# Rodando o bot
bot.run('MTMzMTA4NzY5OTAxNjQxNzM2MQ.GdGt4y.7-ZhyfOHXCORfQZgxIvtXoVPmp2ug5xv48WFQo')
