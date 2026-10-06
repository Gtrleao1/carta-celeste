-- Exemplo de trecho do relatório, exibido na página do produto.
-- Os textos abaixo descrevem um mapa fictício (14/07/1995, 15h30, Campinas),
-- o mesmo usado na roda de exemplo do site.

alter table public.products add column sample_excerpt text;

update public.products set sample_excerpt = $t$### Sol em Câncer na casa 8

Com o Sol em Câncer na casa 8, a sua identidade se constrói a partir da profundidade. Você tende a sentir tudo com intensidade e a buscar vínculos nos quais possa confiar de verdade, e é justamente aí que mora a sua força: poucas pessoas conseguem ficar tão presentes nos momentos difíceis de quem amam.

O Ascendente em Sagitário pede movimento e sentido, enquanto a Lua em Aquário pede liberdade para sentir do seu jeito. O desafio do seu mapa é conciliar esse desejo de espaço com a necessidade de intimidade que o Sol revela.$t$
where slug = 'mapa-astral-completo';

update public.products set sample_excerpt = $t$### Meio do Céu em Virgem

Com o Meio do Céu em Virgem, o reconhecimento profissional chega pela qualidade, pelo cuidado com os detalhes e pela capacidade de tornar processos mais claros e eficientes. Ambientes em que a sua precisão é valorizada tendem a fazer você crescer com mais naturalidade.

Como Mercúrio é o regente da casa 10, a forma como você comunica o seu trabalho pesa tanto quanto o trabalho em si: vale investir em mostrar com clareza o que você entrega.$t$
where slug = 'mapa-profissional';

update public.products set sample_excerpt = $t$### Casa 7 em Gêmeos

Com a casa 7 em Gêmeos, você tende a buscar parcerias em que a conversa seja parte do afeto: leveza, curiosidade e troca de ideias criam proximidade. Relações em que o silêncio pesa ou em que tudo é levado a ferro e fogo podem cansar.

O regente da casa 7 mostra onde essa busca ganha forma na sua vida. Quando ele conversa bem com os demais símbolos do mapa, os vínculos tendem a ser mais fluidos; quando há tensão, o aprendizado está em dizer em voz alta o que se deseja.$t$
where slug = 'mapa-do-amor-e-sexo';
