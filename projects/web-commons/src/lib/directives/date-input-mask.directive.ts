import { Directive, HostListener, Input } from '@angular/core';

/**
 * Auto-insere o separador enquanto digita num p-datepicker, respeitando o [dateFormat] real do
 * campo (nunca hardcoded dd/mm/yyyy - ver csDateInputMaskFormat) - mesmo espírito de
 * CpfCnpjMaskDirective, mas só toca o texto exibido no <input> interno do PrimeNG, nunca o
 * FormControl (isso é papel do próprio p-datepicker via seu onUserInput/parseValueFromString).
 *
 * Sem isso, digitar só os dígitos (sem os separadores) nunca bate com dateFormat, e o campo volta
 * vazio ao perder o foco - o usuário nem percebe que "errou", só que a data digitada
 * desapareceu.
 *
 * O listener nativo do PrimeNG já está registrado no <input> desde que a view dele foi criada,
 * antes de qualquer directive de fora conseguir se anexar - então ele sempre roda ANTES deste
 * para a MESMA tecla. Isso significa que o separador recém-inserido por este listener só é
 * "visto" pelo PrimeNG na tecla SEGUINTE, nunca na mesma - atraso de uma tecla, inofensivo: a
 * última tecla digitada sempre completa o texto no formato exato (todos os separadores já foram
 * inseridos pelas teclas anteriores), então o parse final sempre funciona.
 *
 * DESLIGADA no modo intervalo (csDateInputMaskRange) - mexer no texto de um campo com duas datas
 * (selectionMode="range") quebrava a seleção pelo calendário e descartava o valor ao perder o
 * foco (bug encontrado em produção), mesmo sem a máscara (digitar a segunda data manualmente
 * inteira tem o mesmo problema). Por isso os campos "range" voltam a usar
 * [readonlyInput]="true" (só calendário, como sempre foi) - este flag existe só pra manter o
 * directive presente sem quebrar nada caso algum campo range volte a permitir digitação no
 * futuro (nesse caso, ligar de novo aqui exigiria investigar a causa raiz do bug acima).
 */
@Directive({
  selector: '[csDateInputMask]',
  standalone: true,
})
export class DateInputMaskDirective {
  /** Mesmo valor do [dateFormat] do p-datepicker - cada grupo de letras (d/m/y) vira um bloco de
   *  dígitos: "y" isolado = 2 dígitos, "yy" (ou mais) = 4 dígitos (convenção PrimeNG/jQuery UI),
   *  "d"/"m" sempre 2 dígitos. Ex.: "dd/mm/yy" -> [2,2,4], "mm/dd/yy" -> [2,2,4] (mesma largura,
   *  ordem diferente), "mm/yy" -> [2,4], "yy" -> [4]. */
  @Input() csDateInputMaskFormat = 'dd/mm/yy';

  /** true pra selectionMode="range" - desliga a máscara (ver aviso na doc da classe). */
  @Input() csDateInputMaskRange = false;

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    if (this.csDateInputMaskRange) return;

    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const { segments, separator } = parseFormat(this.csDateInputMaskFormat);
    const maxDigits = segments.reduce((sum, width) => sum + width, 0);

    const raw = input.value ?? '';
    const caret = input.selectionStart ?? raw.length;
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D+/g, '').length;

    const digits = raw.replace(/\D+/g, '').slice(0, maxDigits);
    const masked = formatBySegments(digits, segments, separator);

    if (input.value !== masked) {
      input.value = masked;
      const nextPos = caretFromDigitIndex(masked, digitsBeforeCaret);
      try {
        input.setSelectionRange(nextPos, nextPos);
      } catch {
        // ignore - alguns tipos de input não suportam setSelectionRange
      }
    }
  }
}

/** @returns a largura em dígitos de cada bloco (d/m/y) do formato, na ordem em que aparecem, e o
 *  separador literal entre eles (o primeiro caractere não alfanumérico encontrado - "/" se
 *  nenhum, ex.: formato "yy" sozinho). */
function parseFormat(format: string): { segments: number[]; separator: string } {
  const tokens = format.match(/[a-zA-Z]+/g) ?? ['d', 'd', 'm', 'm', 'y', 'y'];
  const segments = tokens.map((token) => (token[0] === 'y' ? (token.length <= 1 ? 2 : 4) : 2));
  const separatorMatch = format.match(/[^a-zA-Z0-9]/);
  return { segments, separator: separatorMatch ? separatorMatch[0] : '/' };
}

function formatBySegments(digits: string, segments: number[], separator: string): string {
  let out = '';
  let pos = 0;

  for (let i = 0; i < segments.length; i++) {
    const chunk = digits.slice(pos, pos + segments[i]);
    if (!chunk) break;
    if (i > 0) out += separator;
    out += chunk;
    pos += segments[i];
  }

  return out;
}

/** Reposiciona o cursor depois de reescrever o texto mascarado - conta quantos dígitos "crus"
 *  estavam antes do cursor original e acha a posição correspondente no texto já mascarado
 *  (mesma lógica de CpfCnpjMaskDirective.caretFromDigitIndex). */
function caretFromDigitIndex(masked: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  let count = 0;

  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) count++;
    if (count >= digitIndex) return i + 1;
  }

  return masked.length;
}
