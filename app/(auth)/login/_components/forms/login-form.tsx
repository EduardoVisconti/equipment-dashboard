'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';

export function LoginForm({ className }: React.ComponentProps<'form'>) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		try {
			await signInWithEmailAndPassword(auth, email, password);
			toast.success('Signed in successfully');
			router.push('/dashboard');
		} catch (err) {
			toast.error('Invalid email or password');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form
			onSubmit={onSubmit}
			className={cn('flex flex-col gap-6', className)}
		>
			<FieldGroup>
				<div className='flex flex-col items-center gap-1 text-center'>
					<h1 className='text-2xl font-bold'>Sign in to AssetOps</h1>
					<p className='text-muted-foreground text-sm text-balance'>
						Use your credentials to access the operations dashboard.
					</p>
				</div>

				<Field>
					<FieldLabel htmlFor='email'>Email</FieldLabel>
					<Input
						id='email'
						name='email'
						type='email'
						placeholder='m@example.com'
						autoComplete='email'
						required
						disabled={loading}
					/>
				</Field>

				<Field>
					<div className='flex items-center'>
						<FieldLabel htmlFor='password'>Password</FieldLabel>
						<Link
							href='/reset-password'
							className='ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground'
							aria-disabled
							onClick={(e) => e.preventDefault()}
						>
							Forgot password? (Coming soon)
						</Link>
					</div>
					<Input
						id='password'
						name='password'
						type='password'
						autoComplete='current-password'
						required
						disabled={loading}
					/>
				</Field>

				<Field>
					<Button
						type='submit'
						disabled={loading}
					>
						{loading ? 'Signing in...' : 'Sign in'}
					</Button>
				</Field>

				<FieldDescription className='text-center'>
					Need access?{' '}
					<span className='text-muted-foreground'>
						Contact your administrator.
					</span>
				</FieldDescription>
			</FieldGroup>
		</form>
	);
}
