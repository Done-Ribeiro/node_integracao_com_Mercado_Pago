const express = require('express');
const MercadoPago = require('mercadopago');
const app = express();
require('dotenv').config()

MercadoPago.configure({
  sandbox: true, //! modo de desenvolvimento
  access_token: process.env.MERCADO_LIVRE_TOKEN,
});

app.get('/', (req, res) => {
  res.send('oi ' + Date.now());
});

app.get('/pagar', async (req, res) => {
  /*
  ! o conceito de 'ID' aqui no 'item' é importantíssimo..
  ! porque ele precisa ser único, e é a única forma que temos de referenciar a venda futuramente
  ! por isso logo abaixo precisamos salvar ele em algum lugar!
  */

  /*
  ! Exemplo de implementação do Banco de Dados
    Pagamentos (tabela)

    id // código // pagador // status
    1 // 168521 // EMAIL_PAGADOR // Não foi pago
    2 // 168532 // EMAIL_PAGADOR // Pago
  ! Quando gerarmos um pagamento as 2 informações que precisamos sempre guardar no BD são 'id' e 'email' (no mínimo essas)
  */

  const id = '' + Date.now();
  const emailDoPagador = process.env.EMAIL_PAGADOR;

  const dados = {
    items: [// VENDA
      item = {
        id: id,// melhores opções aqui ==> 'UUID' ou 'Date.now()'
        title: '1x Hambúrguer',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: parseFloat(15)// precisa ser um float
      }
    ],
    payer: {// PAGADOR
      email: emailDoPagador
    },
    external_reference: id// campo que vamos consultar, quando o mercado mandar pra gente que o pagamento foi Concluído
  }

  try {
    const pagamento = await MercadoPago.preferences.create(dados);
    // console.log(pagamento);

    //! DICA - Salvar no BD => Banco.SalvarPagamento({id: id, pagador: emailDoPagador})

    res.redirect(pagamento.body.init_point);// redireciona usuário para URL de checkout  
  } catch (err) {
    return res.send(err.message);
  }
})

app.post('/notificar', (req, res) => {
  // console.log(req.query);
  const id = req.query.id;

  /*
    o Mercado Pago envia a notificação no exato instante no Pagamento
    somente depois que ele vai salvar no banco de dados dele..

    por isso precisamos esperar um tempo
    para fazer a consulta na base de dados dele
  */ 
  setTimeout(() => {
    const filtro = {
      "order.id": id
    }

    MercadoPago.payment.search({
      qs: filtro
    }).then(data => {
      // console.log(data);
      const pagamento = data.body.results[0];

      if (pagamento != undefined) {
        console.log(pagamento);
        console.log(pagamento.external_reference);
        console.log(pagamento.status);// approved

        // Aplicação processar o Pagamento
        if (pagamento.status === 'approved') {
          //! DICA - Salvar no BD => Banco.definirComoPago(pagamento.external_reference)
        }
      } else {
        console.log('Pagamento não existe!');
      }

    }).catch(err => {
      console.log(err);
    })
  }, 20000);// 20s

  /*
  ! Notificação IPN
    Precisa dar a resposta para o Mercado Pago que recebemos a notificação..
    e desta forma mandamos uma resposta (200) pra eles
  */
  res.send('Ok');
})

app.listen(process.env.PORT ? Number(process.env.PORT) : 3000, (req, res) => {
  console.log('Servidor rodando!');
});
