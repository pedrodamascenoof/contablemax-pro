import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cpf_cnpj: z.string().min(11, 'CPF/CNPJ inválido'),
  person_type: z.enum(['PF', 'PJ']),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
});

type ClientForm = z.infer<typeof clientSchema>;

export default function ClientFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      person_type: 'PF',
    },
  });

  const personType = watch('person_type');

  useEffect(() => {
    if (isEditing) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        reset({
          name: data.name,
          cpf_cnpj: data.cpf_cnpj,
          person_type: data.person_type as 'PF' | 'PJ',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar cliente.',
      });
      navigate('/clients');
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: ClientForm) => {
    if (!user) return;

    setLoading(true);
    try {
      const clientData = {
        name: data.name,
        cpf_cnpj: data.cpf_cnpj,
        person_type: data.person_type,
        email: data.email || null,
        phone: data.phone || null,
        user_id: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Cliente atualizado',
          description: 'As informações foram atualizadas com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);

        if (error) throw error;

        toast({
          title: 'Cliente cadastrado',
          description: 'O cliente foi cadastrado com sucesso.',
        });
      }

      navigate('/clients');
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao salvar cliente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/clients">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Atualize as informações do cliente' : 'Preencha os dados do novo cliente'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="form-section space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo / Razão social *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Nome do cliente"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Tipo de pessoa *</Label>
            <RadioGroup
              value={personType}
              onValueChange={(value) => setValue('person_type', value as 'PF' | 'PJ')}
              className="flex gap-4"
            >
              <Label
                htmlFor="pf"
                className={`flex items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                  personType === 'PF'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="PF" id="pf" />
                <span className="text-sm font-medium">Pessoa Física</span>
              </Label>
              <Label
                htmlFor="pj"
                className={`flex items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                  personType === 'PJ'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="PJ" id="pj" />
                <span className="text-sm font-medium">Pessoa Jurídica</span>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf_cnpj">{personType === 'PJ' ? 'CNPJ *' : 'CPF *'}</Label>
            <Input
              id="cpf_cnpj"
              {...register('cpf_cnpj')}
              placeholder={personType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
            />
            {errors.cpf_cnpj && (
              <p className="text-sm text-destructive">{errors.cpf_cnpj.message}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@exemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/clients')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                isEditing ? 'Atualizar' : 'Cadastrar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
