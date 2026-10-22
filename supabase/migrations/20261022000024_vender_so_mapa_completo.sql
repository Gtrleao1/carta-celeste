-- Por enquanto o site vende só o Mapa Astral Completo. Os outros dois produtos
-- (Profissional e Amor e Sexo) ficam inativos até serem reformulados; nenhum
-- dado é apagado e eles voltam à vitrine ao marcar "Ativo" em /admin/produtos.
update public.products
set active = false
where slug in ('mapa-profissional', 'mapa-do-amor-e-sexo');
